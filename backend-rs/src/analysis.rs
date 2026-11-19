//! Port of `services.py` (rule-based fallback), `ai_service.py` (Claude) and `skkni_reference.py`.
//! Static tables are generated from the Python source by `data/gen_data.py`.

use std::{collections::HashMap, sync::LazyLock, time::Duration};

use md5::{Digest, Md5};
use serde::Deserialize;
use serde_json::{json, Map, Value};

use crate::AppState;

type RoleSkillMap = HashMap<String, HashMap<String, Vec<(String, i64)>>>;

static ROLE_SKILL_MAP: LazyLock<RoleSkillMap> =
    LazyLock::new(|| serde_json::from_str(include_str!("../data/role_skill_map.json")).expect("role_skill_map.json"));
static COURSE_MAP: LazyLock<HashMap<String, Vec<String>>> =
    LazyLock::new(|| serde_json::from_str(include_str!("../data/course_map.json")).expect("course_map.json"));

#[derive(Deserialize)]
struct Skkni {
    scheme_name: String,
    regulation: String,
    note: String,
}
static SKKNI: LazyLock<HashMap<String, Skkni>> =
    LazyLock::new(|| serde_json::from_str(include_str!("../data/skkni.json")).expect("skkni.json"));

const SYSTEM_PROMPT: &str = include_str!("../data/system_prompt.txt");
const MAX_ATTEMPTS: usize = 3;
const RETRY_BACKOFF_S: [u64; 2] = [1, 2];

/// `format_reference_standard(target_role)`
pub fn format_reference_standard(target_role: Option<&str>) -> Option<String> {
    let r = SKKNI.get(target_role?)?;
    Some(format!("{} — {}", r.scheme_name, r.regulation))
}

/// Result of an analysis (same keys the Python dict had).
#[derive(Debug, Clone)]
pub struct Analysis {
    pub match_score: Value,
    pub skills: Vec<Value>,
    pub missing_skills: Vec<String>,
    pub recommended_courses: Vec<String>,
}

/// Python 3.12 `round(x, 1)` (correctly rounded, ties-to-even on the exact binary value).
pub fn round1(x: f64) -> f64 {
    format!("{x:.1}").parse().unwrap_or(x)
}

/// Python 3.12 `sum()` over floats (Neumaier compensated summation).
pub fn py_sum(xs: &[f64]) -> f64 {
    let (mut sum, mut c) = (0.0f64, 0.0f64);
    for &x in xs {
        let t = sum + x;
        if sum.abs() >= x.abs() {
            c += (sum - t) + x;
        } else {
            c += (x - t) + sum;
        }
        sum = t;
    }
    if c.is_finite() {
        sum + c
    } else {
        sum
    }
}

fn simulate_cv_scores(cv_text: &str, skills: &[(String, i64)]) -> Vec<Value> {
    let text_lower = cv_text.to_lowercase();
    let len = cv_text.chars().count();
    skills
        .iter()
        .map(|(name, required)| {
            let keyword = name.to_lowercase();
            let keyword = keyword.split('/').next().unwrap_or("").split('(').next().unwrap_or("").trim().to_string();
            let base: i64 = if text_lower.contains(&keyword) { 55 } else { 20 };
            let digest = Md5::digest(format!("{name}{len}").as_bytes());
            let seed = u32::from_be_bytes([digest[0], digest[1], digest[2], digest[3]]) as i64;
            let current = (base + seed % 25).min(95);
            let gap = (required - current).max(0);
            let priority = if gap >= 30 {
                "HIGH"
            } else if gap >= 15 {
                "MEDIUM"
            } else {
                "LOW"
            };
            json!({"skill": name, "current": current, "required": required, "gap": gap, "priority": priority})
        })
        .collect()
}

/// `_analyze_gap_hardcoded`
pub fn analyze_gap_hardcoded(cv_text: &str, target_role: &str, level: &str) -> Analysis {
    let role_skills = ROLE_SKILL_MAP.get(target_role).unwrap_or_else(|| &ROLE_SKILL_MAP["Software Engineer"]);
    let level_upper = level.to_uppercase();
    let required = role_skills.get(&level_upper).unwrap_or_else(|| &role_skills["MID"]);

    let skills = simulate_cv_scores(cv_text, required);
    let int = |s: &Value, k: &str| s[k].as_i64().unwrap_or(0);
    let total_required: i64 = skills.iter().map(|s| int(s, "required")).sum();
    let total_current: i64 = skills.iter().map(|s| int(s, "current").min(int(s, "required"))).sum();
    let match_score = if total_required > 0 {
        json!(round1(total_current as f64 / total_required as f64 * 100.0))
    } else {
        json!(0)
    };

    let missing: Vec<String> =
        skills.iter().filter(|s| int(s, "gap") >= 20).map(|s| s["skill"].as_str().unwrap().to_string()).collect();
    let mut courses: Vec<String> = vec![];
    for m in &missing {
        match COURSE_MAP.get(m) {
            Some(c) => courses.extend(c.iter().cloned()),
            None => courses.push(format!("Search '{m} course' on Coursera")),
        }
    }
    courses.truncate(8);
    Analysis { match_score, skills, missing_skills: missing, recommended_courses: courses }
}

/// `analyze_gap_with_llm`: Claude when ANTHROPIC_API_KEY is set, silently falling back to rules.
pub async fn analyze_gap_with_llm(st: &AppState, cv_text: &str, target_role: &str, level: &str) -> Analysis {
    if let Some(key) = &st.cfg.anthropic_key {
        match analyze_cv_with_claude(st, key, cv_text, target_role, level).await {
            Ok(a) => return a,
            Err(e) => eprintln!("AI analysis failed, falling back to hardcoded: {e}"),
        }
    }
    analyze_gap_hardcoded(cv_text, target_role, level)
}

/// Python `int(x)` for the values a model could plausibly return.
fn py_int(v: &Value) -> Result<i64, String> {
    match v {
        Value::Number(n) => match n.as_i64() {
            Some(i) => Ok(i),
            None => n
                .as_f64()
                .filter(|f| f.is_finite() && f.abs() < 9.2e18)
                .map(|f| f.trunc() as i64)
                .ok_or_else(|| "int() of non-finite number".to_string()),
        },
        Value::Bool(b) => Ok(*b as i64),
        Value::String(s) => s.trim().parse::<i64>().map_err(|_| format!("invalid literal for int(): {s:?}")),
        other => Err(format!("int() argument must be a string or a number, not {other}")),
    }
}

fn build_user_message(cv_text: &str, target_role: &str, level: &str) -> String {
    let skkni_block = match SKKNI.get(target_role) {
        Some(r) => format!(
            "Gunakan referensi SKKNI berikut sebagai acuan standar kompetensi:\nSkema '{s}', {reg}. {note}\nSelaraskan skill yang kamu pilih dengan konteks skema ini bila relevan.\nIsi field \"reference_standard\" di JSON output dengan: \"{s} — {reg}\".",
            s = r.scheme_name,
            reg = r.regulation,
            note = r.note
        ),
        None => "Belum ada skema SKKNI resmi yang terverifikasi untuk role ini. Gunakan kompetensi berbasis praktik industri umum, dan isi field \"reference_standard\" dengan null.".to_string(),
    };
    let cv: String = cv_text.chars().take(8000).collect();
    format!(
        "Analisis CV berikut untuk posisi **{target_role}** level **{level}**:\n\n---CV TEXT---\n{cv}\n---END CV---\n\n{skkni_block}\n\nBerikan analisis gap skill dalam format JSON sesuai instruksi."
    )
}

enum CallError {
    /// anthropic.APIError / json.JSONDecodeError: retried.
    Retryable(String),
    /// Anything else (e.g. empty `content`): propagates straight to the fallback.
    Fatal(String),
}

async fn call_claude_once(st: &AppState, key: &str, user_message: &str) -> Result<Value, CallError> {
    // Same override the Anthropic SDK honours (also lets the test harness point both backends at a mock).
    let base = std::env::var("ANTHROPIC_BASE_URL").unwrap_or_else(|_| "https://api.anthropic.com".into());
    let resp = st
        .http
        .post(format!("{}/v1/messages", base.trim_end_matches('/')))
        .header("x-api-key", key)
        .header("anthropic-version", "2023-06-01")
        .json(&json!({
            "model": "claude-sonnet-4-20250514",
            "max_tokens": 2000,
            "system": SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": user_message}],
        }))
        .send()
        .await
        .map_err(|e| CallError::Retryable(format!("AI service error: {e}")))?;
    let status = resp.status();
    let body: Value = resp.json().await.map_err(|e| CallError::Retryable(format!("AI service error: {e}")))?;
    if !status.is_success() {
        return Err(CallError::Retryable(format!("AI service error: HTTP {status}: {body}")));
    }
    let text = body["content"][0]["text"].as_str().ok_or_else(|| CallError::Fatal("empty content".into()))?;
    let mut raw = text.trim();
    if raw.starts_with("```") {
        raw = raw.split_once('\n').map(|x| x.1).unwrap_or(&raw[3..]);
        raw = raw.strip_suffix("```").unwrap_or(raw).trim();
    }
    serde_json::from_str(raw).map_err(|_| CallError::Retryable("AI response was not valid JSON".into()))
}

/// `analyze_cv_with_claude`
pub async fn analyze_cv_with_claude(
    st: &AppState,
    key: &str,
    cv_text: &str,
    target_role: &str,
    level: &str,
) -> Result<Analysis, String> {
    let user_message = build_user_message(cv_text, target_role, level);
    let mut result = None;
    for attempt in 1..=MAX_ATTEMPTS {
        match call_claude_once(st, key, &user_message).await {
            Ok(v) => {
                result = Some(v);
                break;
            }
            Err(CallError::Fatal(e)) => return Err(e),
            Err(CallError::Retryable(e)) if attempt == MAX_ATTEMPTS => return Err(e),
            Err(CallError::Retryable(e)) => {
                eprintln!("Claude attempt {attempt}/{MAX_ATTEMPTS} failed ({e}), retrying in {}s", RETRY_BACKOFF_S[attempt - 1]);
                tokio::time::sleep(Duration::from_secs(RETRY_BACKOFF_S[attempt - 1])).await;
            }
        }
    }
    let result = result.ok_or("no result")?;
    let Value::Object(mut obj) = result else { return Err("AI response is not an object".into()) };

    let score = obj.get("match_score").and_then(Value::as_f64).ok_or("Invalid match_score")?;
    let skills = match obj.get_mut("skills") {
        Some(Value::Array(a)) if !a.is_empty() => a,
        _ => return Err("Invalid skills array".into()),
    };
    for s in skills.iter_mut() {
        let Value::Object(m) = s else { return Err("skill is not an object".into()) };
        let cur = py_int(m.get("current").unwrap_or(&json!(0)))?.clamp(0, 100);
        let req = py_int(m.get("required").unwrap_or(&json!(0)))?.clamp(0, 100);
        let gap = (req - cur).max(0);
        m.insert("current".into(), json!(cur));
        m.insert("required".into(), json!(req));
        m.insert("gap".into(), json!(gap));
        m.insert("priority".into(), json!(if gap >= 30 { "HIGH" } else if gap >= 15 { "MEDIUM" } else { "LOW" }));
    }
    let skills: Vec<Value> = std::mem::take(skills);

    // max(0, min(100, round(x, 1))): the clamp bounds are Python ints.
    let r = round1(score);
    let match_score = if r <= 0.0 {
        json!(0)
    } else if r >= 100.0 {
        json!(100)
    } else {
        json!(r)
    };
    let mut missing = vec![];
    for s in &skills {
        if s["gap"].as_i64().unwrap_or(0) >= 20 {
            missing.push(s.get("skill").and_then(Value::as_str).ok_or("skill name missing")?.to_string());
        }
    }
    let courses = match obj.get("recommended_courses") {
        None => vec![],
        Some(Value::Array(a)) => a
            .iter()
            .take(8)
            .map(|c| c.as_str().map(String::from).ok_or("course is not a string"))
            .collect::<Result<_, _>>()?,
        Some(_) => return Err("recommended_courses is not a list".into()),
    };
    Ok(Analysis { match_score, skills, missing_skills: missing, recommended_courses: courses })
}

/// Aggregation helper shared by company overview: `{skill: [sum_gap, count]}` in first-seen order.
pub fn aggregate_top_gaps(skill_details: &[Option<String>], limit: usize) -> Vec<Value> {
    let mut agg: Vec<(String, f64, i64)> = vec![];
    let mut idx: HashMap<String, usize> = HashMap::new();
    for sd in skill_details.iter().flatten() {
        if sd.is_empty() {
            continue;
        }
        let Ok(Value::Array(skills)) = serde_json::from_str::<Value>(sd) else { continue };
        for s in skills {
            let gap = s.get("gap").and_then(Value::as_f64).unwrap_or(0.0);
            if gap <= 0.0 {
                continue;
            }
            let name = s.get("skill").and_then(Value::as_str).unwrap_or("?").to_string();
            let i = *idx.entry(name.clone()).or_insert_with(|| {
                agg.push((name, 0.0, 0));
                agg.len() - 1
            });
            agg[i].1 += gap;
            agg[i].2 += 1;
        }
    }
    let mut rows: Vec<(String, f64, i64)> =
        agg.into_iter().map(|(k, sum, n)| (k, round1(sum / n as f64), n)).collect();
    // sort(key=(avg_gap, count), reverse=True): stable, descending.
    rows.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap().then(b.2.cmp(&a.2)));
    rows.truncate(limit);
    rows.into_iter().map(|(skill, avg_gap, count)| json!({"skill": skill, "avg_gap": avg_gap, "count": count})).collect()
}

/// Insert-ordered `dict[str, int]` counter (Python dict semantics).
#[derive(Default)]
pub struct Counter(pub Vec<(String, i64)>);
impl Counter {
    pub fn add(&mut self, k: &str) {
        match self.0.iter_mut().find(|(n, _)| n == k) {
            Some(e) => e.1 += 1,
            None => self.0.push((k.to_string(), 1)),
        }
    }
    pub fn get(&self, k: &str) -> i64 {
        self.0.iter().find(|(n, _)| n == k).map(|e| e.1).unwrap_or(0)
    }
    /// `sorted(d.items(), key=lambda x: x[1], reverse=True)[:n]` (stable).
    pub fn top(&self, n: usize) -> Vec<(String, i64)> {
        let mut v = self.0.clone();
        v.sort_by(|a, b| b.1.cmp(&a.1));
        v.truncate(n);
        v
    }
    pub fn to_json(&self) -> Value {
        Value::Object(self.0.iter().map(|(k, v)| (k.clone(), json!(v))).collect::<Map<_, _>>())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fallback_is_case_insensitive_on_level() {
        let a = analyze_gap_hardcoded("Pengalaman SQL dan Python selama 3 tahun", "Data Analyst", "MID");
        let b = analyze_gap_hardcoded("Pengalaman SQL dan Python selama 3 tahun", "Data Analyst", "mid");
        assert_eq!(a.match_score, b.match_score);
        assert_eq!(a.skills.len(), 6);
        assert!(a.recommended_courses.len() <= 8);
    }

    #[test]
    fn round_and_sum_follow_python() {
        assert_eq!(round1(0.25), 0.2);
        assert_eq!(round1(62.549999), 62.5);
        assert_eq!(py_sum(&[0.1; 10]), 1.0); // naive summation gives 0.9999999999999999
    }
}
