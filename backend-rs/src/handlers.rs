//! HTTP handlers: a 1:1 port of `api/routes.py` + `api/controllers.py` (+ the two routes in `main.py`).
//!
//! Evaluation order mirrors FastAPI: body JSON decode -> auth dependency -> field validation
//! -> handler body. (Auth errors therefore win over 422 for missing fields.)

use std::collections::{HashMap, HashSet};

use axum::{
    body::Bytes,
    extract::{multipart::MultipartRejection, Multipart, Path, State},
    http::HeaderMap,
    Json,
};
use rand::RngCore;
use serde_json::{json, Value};
use sqlx::{Postgres, QueryBuilder};

use crate::{
    analysis::{self, aggregate_top_gaps, format_reference_standard, py_sum, round1, Counter},
    auth::{self, authenticate, create_access_token, encode_claims, hash_password, now_ts, require_role, verify_password},
    db::{iso, now_utc, Analysis, Invite, JobRole, User, ANALYSIS_COLS, INVITE_COLS, ROLE_COLS, USER_COLS},
    email,
    error::{validation_item, ApiError, ApiResult},
    pdf, pyjson,
    validate::{self, def, json_body, missing_body_field, model, opt, path_int, req, Ty},
    AppState,
};

type R = ApiResult<Json<Value>>;

// ---------------------------------------------------------------- helpers

/// `secrets.token_urlsafe(n)`
fn token_urlsafe(nbytes: usize) -> String {
    use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
    let mut buf = vec![0u8; nbytes];
    rand::rngs::OsRng.fill_bytes(&mut buf);
    URL_SAFE_NO_PAD.encode(buf)
}

fn user_brief(u: &User) -> Value {
    json!({"id": u.id, "name": u.name, "email": u.email, "role": u.role})
}

fn user_full(u: &User) -> Value {
    json!({
        "id": u.id, "name": u.name, "email": u.email, "role": u.role,
        "phone": u.phone, "bio": u.bio,
        "target_role": u.target_role, "experience_level": u.experience_level,
    })
}

fn token_response(st: &AppState, u: &User) -> Json<Value> {
    Json(json!({
        "access_token": create_access_token(&st.cfg.jwt_secret, u.id, u.role.as_deref()),
        "token_type": "bearer",
        "user": user_brief(u),
    }))
}

fn split_csv(s: &Option<String>) -> Vec<String> {
    match s {
        Some(s) if !s.is_empty() => s.split(',').map(String::from).collect(),
        _ => vec![],
    }
}

fn parse_skills(a: &Analysis) -> ApiResult<Vec<Value>> {
    match a.skill_details.as_deref() {
        Some(s) if !s.is_empty() => match serde_json::from_str::<Value>(s) {
            Ok(Value::Array(v)) => Ok(v),
            _ => Err(ApiError::Internal(format!("analysis {} has malformed skill_details", a.id))),
        },
        _ => Ok(vec![]),
    }
}

fn num(v: &Value) -> f64 {
    v.as_f64().unwrap_or(0.0)
}

async fn user_by_email(st: &AppState, email: &str) -> ApiResult<Option<User>> {
    Ok(sqlx::query_as::<_, User>(&format!("SELECT {USER_COLS} FROM users WHERE email = $1 LIMIT 1"))
        .bind(email)
        .fetch_optional(&st.pool)
        .await?)
}

async fn insert_user(st: &AppState, u: NewUser) -> ApiResult<User> {
    Ok(sqlx::query_as::<_, User>(&format!(
        "INSERT INTO users (name, email, password_hash, role, target_role, experience_level, created_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING {USER_COLS}"
    ))
    .bind(u.name)
    .bind(u.email)
    .bind(u.password_hash)
    .bind(u.role)
    .bind(u.target_role)
    .bind(u.experience_level)
    .bind(now_utc())
    .fetch_one(&st.pool)
    .await?)
}

struct NewUser {
    name: String,
    email: String,
    password_hash: String,
    role: String,
    target_role: Option<String>,
    experience_level: Option<String>,
}

async fn insert_analysis(st: &AppState, user_id: i32, role: &str, level: &str, r: &analysis::Analysis) -> ApiResult<Analysis> {
    Ok(sqlx::query_as::<_, Analysis>(&format!(
        "INSERT INTO analysis_results (match_score, target_role, level, missing_skills, skill_details, \
         recommended_courses, user_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING {ANALYSIS_COLS}"
    ))
    .bind(r.match_score.as_f64())
    .bind(role)
    .bind(level)
    .bind(r.missing_skills.join(","))
    .bind(pyjson::dumps(&Value::Array(r.skills.clone())))
    .bind(r.recommended_courses.join(","))
    .bind(user_id)
    .bind(now_utc())
    .fetch_one(&st.pool)
    .await?)
}

struct FilePart {
    filename: Option<String>,
    data: Vec<u8>,
}
#[derive(Default)]
struct Form {
    fields: HashMap<String, String>,
    file: Option<FilePart>,
}

/// Drain a multipart body. A non-multipart request simply yields an empty form
/// (FastAPI then reports the missing fields as 422).
async fn read_form(mp: Result<Multipart, MultipartRejection>) -> ApiResult<Form> {
    let mut form = Form::default();
    let Ok(mut mp) = mp else { return Ok(form) };
    while let Some(field) = mp.next_field().await.map_err(|_| ApiError::http(400, "There was an error parsing the body"))? {
        let name = field.name().unwrap_or("").to_string();
        let filename = field.file_name().map(String::from);
        let data = field.bytes().await.map_err(|_| ApiError::http(400, "There was an error parsing the body"))?;
        if name == "file" && filename.is_some() {
            form.file = Some(FilePart { filename, data: data.to_vec() });
        } else {
            form.fields.insert(name, String::from_utf8_lossy(&data).into_owned());
        }
    }
    Ok(form)
}

async fn extract_pdf_text(data: Vec<u8>) -> ApiResult<String> {
    tokio::task::spawn_blocking(move || pdf::extract_text(&data))
        .await
        .map_err(|e| ApiError::Internal(e.to_string()))?
        .map_err(|e| ApiError::Internal(format!("PDF extraction failed: {e}")))
}

// ---------------------------------------------------------------- main.py

pub async fn read_root() -> Json<Value> {
    Json(json!({"message": "Welcome to NaviKarier API", "version": "2.0.0"}))
}

pub async fn health_check(State(st): State<AppState>) -> Json<Value> {
    let ok = sqlx::query("SELECT 1").execute(&st.pool).await.is_ok();
    Json(json!({"status": "ok", "database": if ok { "ok" } else { "error" }, "version": "2.0.0"}))
}

// ---------------------------------------------------------------- auth

pub async fn register(State(st): State<AppState>, headers: HeaderMap, body: Bytes) -> R {
    let m = model(
        json_body(&headers, &body)?,
        &[req("name", Ty::Str), req("email", Ty::Str), req("password", Ty::Str), def("role", "JOBSEEKER")],
    )?;
    if user_by_email(&st, &m.str("email")).await?.is_some() {
        return Err(ApiError::http(400, "Email sudah terdaftar"));
    }
    let user = insert_user(
        &st,
        NewUser {
            name: m.str("name"),
            email: m.str("email"),
            password_hash: hash_password(m.str("password")).await?,
            role: m.str("role"),
            target_role: None,
            experience_level: None,
        },
    )
    .await?;
    Ok(token_response(&st, &user))
}

pub async fn login(State(st): State<AppState>, headers: HeaderMap, body: Bytes) -> R {
    let m = model(json_body(&headers, &body)?, &[req("email", Ty::Str), req("password", Ty::Str)])?;
    let user = user_by_email(&st, &m.str("email")).await?;
    match user {
        Some(u) if verify_password(m.str("password"), u.password_hash.clone()).await? => Ok(token_response(&st, &u)),
        _ => Err(ApiError::http(401, "Email atau password salah")),
    }
}

pub async fn me(State(st): State<AppState>, headers: HeaderMap) -> R {
    let user = authenticate(&st, &headers).await?;
    Ok(Json(user_full(&user)))
}

pub async fn update_profile(State(st): State<AppState>, headers: HeaderMap, body: Bytes) -> R {
    let parsed = json_body(&headers, &body)?;
    let user = authenticate(&st, &headers).await?;
    let m = model(
        parsed,
        &[opt("name"), opt("phone"), opt("bio"), opt("target_role"), opt("experience_level")],
    )?;
    if m.provided.is_empty() {
        return Err(ApiError::http(400, "No fields to update"));
    }
    // Column names come from the static spec above, never from the request.
    let mut qb = QueryBuilder::<Postgres>::new("UPDATE users SET ");
    let mut sep = qb.separated(", ");
    for f in &m.provided {
        sep.push(format!("{f} = ")).push_bind_unseparated(m.opt_str(f));
    }
    qb.push(" WHERE id = ").push_bind(user.id);
    qb.build().execute(&st.pool).await?;

    let fresh = sqlx::query_as::<_, User>(&format!("SELECT {USER_COLS} FROM users WHERE id = $1"))
        .bind(user.id)
        .fetch_one(&st.pool)
        .await?;
    Ok(Json(user_full(&fresh)))
}

pub async fn change_password(State(st): State<AppState>, headers: HeaderMap, body: Bytes) -> R {
    let parsed = json_body(&headers, &body)?;
    let user = authenticate(&st, &headers).await?;
    let m = model(parsed, &[req("old_password", Ty::Str), req("new_password", Ty::Str)])?;
    if !verify_password(m.str("old_password"), user.password_hash.clone()).await? {
        return Err(ApiError::http(400, "Password lama salah"));
    }
    let hash = hash_password(m.str("new_password")).await?;
    sqlx::query("UPDATE users SET password_hash = $1 WHERE id = $2").bind(hash).bind(user.id).execute(&st.pool).await?;
    Ok(Json(json!({"message": "Password berhasil diubah"})))
}

pub async fn forgot_password(State(st): State<AppState>, headers: HeaderMap, body: Bytes) -> R {
    let m = model(json_body(&headers, &body)?, &[req("email", Ty::Str)])?;
    let msg = json!({"message": "Jika email terdaftar, link reset password akan dikirim"});
    let Some(user) = user_by_email(&st, &m.str("email")).await? else { return Ok(Json(msg)) };
    let token = encode_claims(
        &st.cfg.jwt_secret,
        &json!({"sub": user.id.to_string(), "purpose": "reset_password", "exp": now_ts() + 3600}),
    );
    email::send_reset_password_email(&st, user.email.as_deref().unwrap_or(""), &token, user.name.as_deref().unwrap_or("")).await;
    Ok(Json(msg))
}

pub async fn reset_password(State(st): State<AppState>, headers: HeaderMap, body: Bytes) -> R {
    let m = model(json_body(&headers, &body)?, &[req("token", Ty::Str), req("new_password", Ty::Str)])?;
    let claims = auth::decode_claims(&st.cfg.jwt_secret, &m.str("token"))
        .ok_or_else(|| ApiError::http(400, "Token tidak valid atau sudah kedaluwarsa"))?;
    if claims.get("purpose").and_then(Value::as_str) != Some("reset_password") {
        return Err(ApiError::http(400, "Token tidak valid"));
    }
    // int(None) / int("abc") raise in the old backend -> 500.
    let sub = claims.get("sub").and_then(Value::as_str).ok_or_else(|| ApiError::Internal("reset token without sub".into()))?;
    let id: i64 = sub.trim().parse().map_err(|_| ApiError::Internal("reset token sub is not an int".into()))?;
    let exists: Option<i32> =
        sqlx::query_scalar("SELECT id FROM users WHERE id = $1").bind(id).fetch_optional(&st.pool).await?;
    let Some(uid) = exists else { return Err(ApiError::http(400, "Token tidak valid")) };
    let hash = hash_password(m.str("new_password")).await?;
    sqlx::query("UPDATE users SET password_hash = $1 WHERE id = $2").bind(hash).bind(uid).execute(&st.pool).await?;
    Ok(Json(json!({"message": "Password berhasil direset. Silakan login dengan password baru."})))
}

pub async fn oauth(State(st): State<AppState>, headers: HeaderMap, body: Bytes) -> R {
    let payload = match json_body(&headers, &body)? {
        None => {
            return Err(ApiError::Validation(vec![validation_item("missing", vec![json!("body")], "Field required", Value::Null)]))
        }
        Some(Value::Object(o)) => o,
        Some(other) => {
            return Err(ApiError::Validation(vec![validation_item(
                "dict_type",
                vec![json!("body")],
                "Input should be a valid dictionary",
                other,
            )]))
        }
    };
    let secret = headers.get("x-oauth-secret").and_then(|v| v.to_str().ok()).unwrap_or("");
    if secret != st.cfg.oauth_secret {
        return Err(ApiError::http(401, "Unauthorized"));
    }
    let truthy = |v: Option<&Value>| match v {
        None | Some(Value::Null) | Some(Value::Bool(false)) => false,
        Some(Value::String(s)) => !s.is_empty(),
        Some(Value::Number(n)) => n.as_f64() != Some(0.0),
        Some(Value::Array(a)) => !a.is_empty(),
        Some(Value::Object(o)) => !o.is_empty(),
        Some(Value::Bool(true)) => true,
    };
    if !truthy(payload.get("email")) {
        return Err(ApiError::http(400, "email required"));
    }
    let email = payload["email"]
        .as_str()
        .ok_or_else(|| ApiError::Internal("oauth email is not a string".into()))?
        .to_string();
    let name = if truthy(payload.get("name")) {
        payload["name"].as_str().ok_or_else(|| ApiError::Internal("oauth name is not a string".into()))?.to_string()
    } else {
        String::new()
    };

    let user = match user_by_email(&st, &email).await? {
        Some(u) => u,
        None => {
            insert_user(
                &st,
                NewUser {
                    name: if name.is_empty() { email.split('@').next().unwrap_or("").to_string() } else { name },
                    email,
                    password_hash: hash_password(token_urlsafe(16)).await?,
                    role: "JOBSEEKER".into(),
                    target_role: None,
                    experience_level: None,
                },
            )
            .await?
        }
    };
    Ok(token_response(&st, &user))
}

// ---------------------------------------------------------------- CV + analysis

pub async fn upload_cv(State(st): State<AppState>, headers: HeaderMap, mp: Result<Multipart, MultipartRejection>) -> R {
    let user = authenticate(&st, &headers).await?;
    let form = read_form(mp).await?;
    let Some(file) = form.file else { return Err(ApiError::Validation(vec![missing_body_field("file")])) };
    if !file.filename.as_deref().unwrap_or("").ends_with(".pdf") {
        return Err(ApiError::http(400, "Only PDF files are supported"));
    }
    let text = extract_pdf_text(file.data).await?;
    let cv_id: i32 = sqlx::query_scalar("INSERT INTO cv_data (extracted_text, user_id, created_at) VALUES ($1, $2, $3) RETURNING id")
        .bind(text)
        .bind(user.id)
        .bind(now_utc())
        .fetch_one(&st.pool)
        .await?;
    Ok(Json(json!({"message": "CV uploaded successfully", "cv_id": cv_id})))
}

pub async fn analyze_gap(State(st): State<AppState>, headers: HeaderMap, body: Bytes) -> R {
    let parsed = json_body(&headers, &body)?;
    let user = authenticate(&st, &headers).await?;
    let m = model(parsed, &[req("cv_id", Ty::Int), req("target_role", Ty::Str), def("level", "MID")])?;
    let (target_role, level) = (m.str("target_role"), m.str("level"));

    let cv: Option<(Option<String>,)> = sqlx::query_as("SELECT extracted_text FROM cv_data WHERE id = $1 AND user_id = $2 LIMIT 1")
        .bind(m.int("cv_id"))
        .bind(user.id)
        .fetch_optional(&st.pool)
        .await?;
    let Some((text,)) = cv else { return Err(ApiError::http(404, "CV not found")) };

    let result = analysis::analyze_gap_with_llm(&st, text.as_deref().unwrap_or(""), &target_role, &level).await;
    let saved = insert_analysis(&st, user.id, &target_role, &level, &result).await?;

    Ok(Json(json!({
        "analysis_id": saved.id,
        "match_score": saved.match_score,
        "target_role": target_role,
        "level": level,
        "skills": result.skills,
        "missing_skills": result.missing_skills,
        "recommended_courses": result.recommended_courses,
        "reference_standard": format_reference_standard(Some(&target_role)),
    })))
}

pub async fn get_recommendations(State(st): State<AppState>, headers: HeaderMap, Path(analysis_id): Path<String>) -> R {
    let user = authenticate(&st, &headers).await?;
    let id = path_int("analysis_id", &analysis_id)?;
    let a = sqlx::query_as::<_, Analysis>(&format!(
        "SELECT {ANALYSIS_COLS} FROM analysis_results WHERE id = $1 AND user_id = $2 LIMIT 1"
    ))
    .bind(id)
    .bind(user.id)
    .fetch_optional(&st.pool)
    .await?
    .ok_or_else(|| ApiError::http(404, "Analysis not found"))?;

    Ok(Json(json!({
        "id": a.id,
        "match_score": a.match_score,
        "target_role": a.target_role,
        "level": a.level,
        "skills": parse_skills(&a)?,
        "missing_skills": split_csv(&a.missing_skills),
        "recommended_courses": split_csv(&a.recommended_courses),
        "created_at": iso(a.created_at),
        "reference_standard": format_reference_standard(a.target_role.as_deref()),
    })))
}

async fn analyses_for(st: &AppState, user_id: i32) -> ApiResult<Vec<Analysis>> {
    Ok(sqlx::query_as::<_, Analysis>(&format!(
        "SELECT {ANALYSIS_COLS} FROM analysis_results WHERE user_id = $1 ORDER BY created_at DESC"
    ))
    .bind(user_id)
    .fetch_all(&st.pool)
    .await?)
}

pub async fn dashboard_overview(State(st): State<AppState>, headers: HeaderMap) -> R {
    let user = authenticate(&st, &headers).await?;
    let analyses = analyses_for(&st, user.id).await?;
    if analyses.is_empty() {
        return Ok(Json(json!({
            "match_score": 0, "skills_analyzed": 0, "gaps_found": 0, "total_analyses": 0,
            "recent_analyses": [], "top_gaps": [],
        })));
    }
    let mut all_skills: Vec<Value> = vec![];
    for a in &analyses {
        all_skills.extend(parse_skills(a)?);
    }
    let mut gaps: Vec<&Value> = all_skills.iter().filter(|s| s.get("gap").map_or(0.0, num) > 0.0).collect();
    gaps.sort_by(|a, b| num(&b["gap"]).partial_cmp(&num(&a["gap"])).unwrap()); // stable == Python's reverse=True
    let recent: Vec<Value> = analyses
        .iter()
        .take(5)
        .map(|a| json!({"id": a.id, "target_role": a.target_role, "match_score": a.match_score, "created_at": iso(a.created_at)}))
        .collect();
    Ok(Json(json!({
        "match_score": analyses[0].match_score,
        "skills_analyzed": all_skills.len(),
        "gaps_found": gaps.len(),
        "total_analyses": analyses.len(),
        "recent_analyses": recent,
        "top_gaps": gaps.iter().take(5).collect::<Vec<_>>(),
    })))
}

pub async fn analysis_history(State(st): State<AppState>, headers: HeaderMap) -> R {
    let user = authenticate(&st, &headers).await?;
    let rows: Vec<Value> = analyses_for(&st, user.id)
        .await?
        .iter()
        .map(|a| {
            json!({
                "id": a.id, "target_role": a.target_role, "level": a.level, "match_score": a.match_score,
                "missing_skills": split_csv(&a.missing_skills), "created_at": iso(a.created_at),
            })
        })
        .collect();
    Ok(Json(Value::Array(rows)))
}

pub async fn contact(State(st): State<AppState>, headers: HeaderMap, body: Bytes) -> R {
    let m = model(
        json_body(&headers, &body)?,
        &[req("name", Ty::Str), req("email", Ty::Str), def("type", "General"), req("message", Ty::Str)],
    )?;
    email::send_contact_email(&st, &m.str("name"), &m.str("email"), &m.str("type"), &m.str("message")).await;
    Ok(Json(json!({"message": "Pesan berhasil dikirim"})))
}

// ---------------------------------------------------------------- admin / company aggregates

fn avg_score(scores: &[f64]) -> Value {
    if scores.is_empty() {
        json!(0)
    } else {
        json!(round1(py_sum(scores) / scores.len() as f64))
    }
}

fn top_roles_json(c: &Counter) -> Vec<Value> {
    c.top(5).into_iter().map(|(role, count)| json!({"role": role, "count": count})).collect()
}

async fn all_analysis_scores(st: &AppState) -> ApiResult<Vec<(Option<i32>, Option<String>, Option<f64>)>> {
    Ok(sqlx::query_as("SELECT user_id, target_role, match_score FROM analysis_results ORDER BY id").fetch_all(&st.pool).await?)
}

pub async fn admin_overview(State(st): State<AppState>, headers: HeaderMap) -> R {
    require_role(&st, &headers, &["ADMIN"]).await?;
    let users = sqlx::query_as::<_, User>(&format!("SELECT {USER_COLS} FROM users ORDER BY id")).fetch_all(&st.pool).await?;
    let analyses = all_analysis_scores(&st).await?;
    let cv_count: i64 = sqlx::query_scalar("SELECT count(*) FROM cv_data").fetch_one(&st.pool).await?;

    let mut by_role = Counter::default();
    for u in &users {
        by_role.add(u.role.as_deref().unwrap_or("null"));
    }
    let scores: Vec<f64> = analyses.iter().filter_map(|a| a.2).collect();
    let mut demand = Counter::default();
    for a in &analyses {
        demand.add(a.1.as_deref().unwrap_or("null"));
    }
    let recent = sqlx::query_as::<_, User>(&format!("SELECT {USER_COLS} FROM users ORDER BY created_at DESC LIMIT 8"))
        .fetch_all(&st.pool)
        .await?;

    Ok(Json(json!({
        "total_users": users.len(),
        "total_jobseekers": by_role.get("JOBSEEKER"),
        "total_companies": by_role.get("COMPANY"),
        "total_admins": by_role.get("ADMIN"),
        "total_analyses": analyses.len(),
        "total_cvs": cv_count,
        "avg_match_score": avg_score(&scores),
        "users_by_role": by_role.to_json(),
        "top_roles": top_roles_json(&demand),
        "recent_users": recent.iter().map(|u| json!({
            "id": u.id, "name": u.name, "email": u.email, "role": u.role, "created_at": iso(u.created_at),
        })).collect::<Vec<_>>(),
    })))
}

pub async fn admin_users(State(st): State<AppState>, headers: HeaderMap) -> R {
    require_role(&st, &headers, &["ADMIN"]).await?;
    let users = sqlx::query_as::<_, User>(&format!("SELECT {USER_COLS} FROM users ORDER BY created_at DESC"))
        .fetch_all(&st.pool)
        .await?;
    let counts: HashMap<Option<i32>, i64> = sqlx::query_as::<_, (Option<i32>, i64)>("SELECT user_id, count(*) FROM analysis_results GROUP BY user_id")
        .fetch_all(&st.pool)
        .await?
        .into_iter()
        .collect();
    Ok(Json(Value::Array(
        users
            .iter()
            .map(|u| {
                json!({
                    "id": u.id, "name": u.name, "email": u.email, "role": u.role,
                    "phone": u.phone, "target_role": u.target_role,
                    "analyses_count": counts.get(&Some(u.id)).copied().unwrap_or(0),
                    "created_at": iso(u.created_at),
                })
            })
            .collect(),
    )))
}

pub async fn company_overview(State(st): State<AppState>, headers: HeaderMap) -> R {
    require_role(&st, &headers, &["COMPANY", "ADMIN"]).await?;
    let analyses = all_analysis_scores(&st).await?;
    let details: Vec<Option<String>> =
        sqlx::query_scalar("SELECT skill_details FROM analysis_results ORDER BY id").fetch_all(&st.pool).await?;
    let candidates: HashSet<Option<i32>> = analyses.iter().map(|a| a.0).collect();
    let scores: Vec<f64> = analyses.iter().filter_map(|a| a.2).collect();
    let mut demand = Counter::default();
    for a in &analyses {
        demand.add(a.1.as_deref().unwrap_or("null"));
    }
    Ok(Json(json!({
        "total_candidates": candidates.len(),
        "total_analyses": analyses.len(),
        "avg_match_score": avg_score(&scores),
        "job_ready": scores.iter().filter(|s| **s >= 75.0).count(),
        "top_roles": top_roles_json(&demand),
        "top_gaps": aggregate_top_gaps(&details, 8),
    })))
}

pub async fn company_talent(State(st): State<AppState>, headers: HeaderMap) -> R {
    require_role(&st, &headers, &["COMPANY", "ADMIN"]).await?;
    let rows = sqlx::query_as::<_, (i32, Option<String>, Option<String>, Option<String>, Option<f64>, Option<String>, Option<chrono::NaiveDateTime>)>(
        "SELECT a.id, u.name, a.target_role, a.level, a.match_score, a.missing_skills, a.created_at \
         FROM analysis_results a JOIN users u ON a.user_id = u.id ORDER BY a.match_score DESC",
    )
    .fetch_all(&st.pool)
    .await?;
    Ok(Json(Value::Array(
        rows.into_iter()
            .map(|(id, name, role, level, score, missing, created)| {
                json!({
                    "analysis_id": id, "candidate": name, "target_role": role, "level": level,
                    "match_score": score, "missing_count": split_csv(&missing).len(), "created_at": iso(created),
                })
            })
            .collect(),
    )))
}

// ---------------------------------------------------------------- company: job roles

async fn job_role_json(st: &AppState, r: &JobRole) -> ApiResult<Value> {
    let match_count: i64 = sqlx::query_scalar("SELECT count(*) FROM analysis_results WHERE target_role = $1")
        .bind(&r.title)
        .fetch_one(&st.pool)
        .await?;
    let skills: Vec<String> = r
        .required_skills
        .as_deref()
        .unwrap_or("")
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();
    Ok(json!({
        "id": r.id, "title": r.title, "level": r.level, "required_skills": skills,
        "match_count": match_count, "created_at": iso(r.created_at),
    }))
}

pub async fn create_role(State(st): State<AppState>, headers: HeaderMap, body: Bytes) -> R {
    let parsed = json_body(&headers, &body)?;
    let user = require_role(&st, &headers, &["COMPANY", "ADMIN"]).await?;
    let m = model(parsed, &[req("title", Ty::Str), def("level", "MID"), req("required_skills", Ty::Str)])?;
    let title = m.str("title");
    if title.trim().is_empty() {
        return Err(ApiError::http(400, "Judul posisi wajib diisi"));
    }
    let role = sqlx::query_as::<_, JobRole>(&format!(
        "INSERT INTO job_roles (user_id, title, level, required_skills, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING {ROLE_COLS}"
    ))
    .bind(user.id)
    .bind(title.trim())
    .bind(m.str("level"))
    .bind(m.str("required_skills").trim())
    .bind(now_utc())
    .fetch_one(&st.pool)
    .await?;
    Ok(Json(job_role_json(&st, &role).await?))
}

pub async fn list_roles(State(st): State<AppState>, headers: HeaderMap) -> R {
    let user = require_role(&st, &headers, &["COMPANY", "ADMIN"]).await?;
    let roles = sqlx::query_as::<_, JobRole>(&format!("SELECT {ROLE_COLS} FROM job_roles WHERE user_id = $1 ORDER BY created_at DESC"))
        .bind(user.id)
        .fetch_all(&st.pool)
        .await?;
    let mut out = vec![];
    for r in &roles {
        out.push(job_role_json(&st, r).await?);
    }
    Ok(Json(Value::Array(out)))
}

pub async fn delete_role(State(st): State<AppState>, headers: HeaderMap, Path(role_id): Path<String>) -> R {
    let user = require_role(&st, &headers, &["COMPANY", "ADMIN"]).await?;
    let id = path_int("role_id", &role_id)?;
    let deleted = sqlx::query("DELETE FROM job_roles WHERE id = $1 AND user_id = $2").bind(id).bind(user.id).execute(&st.pool).await?;
    if deleted.rows_affected() == 0 {
        return Err(ApiError::http(404, "Job role tidak ditemukan"));
    }
    Ok(Json(json!({"message": "Job role dihapus"})))
}

// ---------------------------------------------------------------- company: invites

fn invite_json(st: &AppState, i: &Invite) -> Value {
    json!({
        "id": i.id, "token": i.token, "target_role": i.target_role, "level": i.level,
        "candidate_email": i.candidate_email, "candidate_name": i.candidate_name, "status": i.status,
        "link": format!("{}/invite/{}", st.cfg.frontend_url, i.token.as_deref().unwrap_or("")),
        "created_at": iso(i.created_at),
    })
}

pub async fn create_invite(State(st): State<AppState>, headers: HeaderMap, body: Bytes) -> R {
    let parsed = json_body(&headers, &body)?;
    let user = require_role(&st, &headers, &["COMPANY", "ADMIN"]).await?;
    let m = model(parsed, &[req("target_role", Ty::Str), def("level", "MID"), opt("candidate_email")])?;
    let inv = sqlx::query_as::<_, Invite>(&format!(
        "INSERT INTO invites (user_id, token, target_role, level, candidate_email, status, created_at) \
         VALUES ($1, $2, $3, $4, $5, 'PENDING', $6) RETURNING {INVITE_COLS}"
    ))
    .bind(user.id)
    .bind(token_urlsafe(16))
    .bind(m.str("target_role"))
    .bind(m.str("level"))
    .bind(m.opt_str("candidate_email"))
    .bind(now_utc())
    .fetch_one(&st.pool)
    .await?;
    let result = invite_json(&st, &inv);
    if let Some(to) = m.opt_str("candidate_email").filter(|e| !e.is_empty()) {
        let link = result["link"].as_str().unwrap_or("").to_string();
        email::send_invite_email(&st, &to, &link, user.name.as_deref().unwrap_or(""), &m.str("target_role")).await;
    }
    Ok(Json(result))
}

pub async fn list_invites(State(st): State<AppState>, headers: HeaderMap) -> R {
    let user = require_role(&st, &headers, &["COMPANY", "ADMIN"]).await?;
    let invs = sqlx::query_as::<_, Invite>(&format!("SELECT {INVITE_COLS} FROM invites WHERE user_id = $1 ORDER BY created_at DESC"))
        .bind(user.id)
        .fetch_all(&st.pool)
        .await?;
    Ok(Json(Value::Array(invs.iter().map(|i| invite_json(&st, i)).collect())))
}

async fn invite_by_token(st: &AppState, token: &str) -> ApiResult<Option<Invite>> {
    Ok(sqlx::query_as::<_, Invite>(&format!("SELECT {INVITE_COLS} FROM invites WHERE token = $1 LIMIT 1"))
        .bind(token)
        .fetch_optional(&st.pool)
        .await?)
}

pub async fn get_invite(State(st): State<AppState>, Path(token): Path<String>) -> R {
    let inv = invite_by_token(&st, &token)
        .await?
        .ok_or_else(|| ApiError::http(404, "Undangan tidak ditemukan atau sudah kedaluwarsa"))?;
    let company: Option<Option<String>> = sqlx::query_scalar("SELECT name FROM users WHERE id = $1 LIMIT 1")
        .bind(inv.user_id)
        .fetch_optional(&st.pool)
        .await?;
    let company_name = match company {
        Some(name) => json!(name),
        None => json!("Perusahaan"),
    };
    Ok(Json(json!({
        "target_role": inv.target_role, "level": inv.level, "company_name": company_name, "status": inv.status,
    })))
}

pub async fn submit_invite(State(st): State<AppState>, Path(token): Path<String>, mp: Result<Multipart, MultipartRejection>) -> R {
    let form = read_form(mp).await?;
    let mut errors = vec![];
    if !form.fields.contains_key("name") {
        errors.push(missing_body_field("name"));
    }
    if form.file.is_none() {
        errors.push(missing_body_field("file"));
    }
    if !errors.is_empty() {
        return Err(ApiError::Validation(errors));
    }
    let (name, file) = (form.fields["name"].clone(), form.file.unwrap());

    let inv = invite_by_token(&st, &token).await?.ok_or_else(|| ApiError::http(404, "Undangan tidak ditemukan"))?;
    if !file.filename.as_deref().unwrap_or("").ends_with(".pdf") {
        return Err(ApiError::http(400, "Hanya file PDF yang didukung"));
    }
    let (invite_role, invite_level) = (inv.target_role.clone().unwrap_or_default(), inv.level.clone().unwrap_or_default());

    // Guest user per invite so the analysis surfaces in the talent pool.
    let email_addr = inv
        .candidate_email
        .clone()
        .filter(|e| !e.is_empty())
        .unwrap_or_else(|| format!("guest+{token}@invite.navikarier.local"));
    let guest = match user_by_email(&st, &email_addr).await? {
        Some(g) => g,
        None => {
            let trimmed = name.trim();
            insert_user(
                &st,
                NewUser {
                    name: if trimmed.is_empty() { "Kandidat".into() } else { trimmed.into() },
                    email: email_addr,
                    password_hash: hash_password(token_urlsafe(12)).await?,
                    role: "JOBSEEKER".into(),
                    target_role: inv.target_role.clone(),
                    experience_level: inv.level.clone(),
                },
            )
            .await?
        }
    };

    let extracted = extract_pdf_text(file.data).await?;
    sqlx::query("INSERT INTO cv_data (extracted_text, user_id, created_at) VALUES ($1, $2, $3)")
        .bind(&extracted)
        .bind(guest.id)
        .bind(now_utc())
        .execute(&st.pool)
        .await?;

    let result = analysis::analyze_gap_with_llm(&st, &extracted, &invite_role, &invite_level).await;
    let mut tx = st.pool.begin().await?;
    sqlx::query(
        "INSERT INTO analysis_results (match_score, target_role, level, missing_skills, skill_details, \
         recommended_courses, user_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
    )
    .bind(result.match_score.as_f64())
    .bind(&invite_role)
    .bind(&invite_level)
    .bind(result.missing_skills.join(","))
    .bind(pyjson::dumps(&Value::Array(result.skills.clone())))
    .bind(result.recommended_courses.join(","))
    .bind(guest.id)
    .bind(now_utc())
    .execute(&mut *tx)
    .await?;
    let trimmed = name.trim();
    let candidate_name = if trimmed.is_empty() { inv.candidate_name.clone() } else { Some(trimmed.to_string()) };
    sqlx::query("UPDATE invites SET status = 'COMPLETED', candidate_name = $1 WHERE id = $2")
        .bind(candidate_name)
        .bind(inv.id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;

    Ok(Json(json!({
        "match_score": result.match_score,
        "target_role": invite_role,
        "missing_count": result.missing_skills.len(),
    })))
}
