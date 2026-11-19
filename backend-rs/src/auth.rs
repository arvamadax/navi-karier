//! JWT (HS256, jose-compatible) + bcrypt, and the `get_current_user` / `require_role` dependencies.

use axum::http::{header, HeaderMap};
use jsonwebtoken::{decode, encode, Algorithm, DecodingKey, EncodingKey, Header, Validation};
use serde_json::{json, Value};

use crate::{
    db::{User, USER_COLS},
    error::{ApiError, ApiResult},
    AppState,
};

pub const ACCESS_TOKEN_EXPIRE_HOURS: i64 = 24;

pub fn now_ts() -> i64 {
    time::OffsetDateTime::now_utc().unix_timestamp()
}

pub fn encode_claims(secret: &str, claims: &Value) -> String {
    encode(&Header::new(Algorithm::HS256), claims, &EncodingKey::from_secret(secret.as_bytes()))
        .expect("HS256 signing cannot fail")
}

/// `jose.jwt.decode(token, secret, algorithms=["HS256"])`: signature + exp/nbf checked, no
/// leeway, `exp` optional, `sub` must be a string. `None` == JWTError.
pub fn decode_claims(secret: &str, token: &str) -> Option<Value> {
    let mut v = Validation::new(Algorithm::HS256);
    v.leeway = 0;
    v.validate_exp = true;
    v.validate_nbf = true;
    v.required_spec_claims.clear();
    let data = decode::<Value>(token, &DecodingKey::from_secret(secret.as_bytes()), &v).ok()?;
    if data.claims.get("sub").is_some_and(|s| !s.is_string()) {
        return None;
    }
    Some(data.claims)
}

pub fn create_access_token(secret: &str, user_id: i32, role: Option<&str>) -> String {
    encode_claims(
        secret,
        &json!({ "sub": user_id.to_string(), "role": role, "exp": now_ts() + ACCESS_TOKEN_EXPIRE_HOURS * 3600 }),
    )
}

// bcrypt 5.x (what `pip install bcrypt` gives today) raises ValueError -> HTTP 500 for these.
fn check_bcrypt_input(pw: &str) -> ApiResult<()> {
    if pw.len() > 72 || pw.contains('\0') {
        return Err(ApiError::Internal("bcrypt: password longer than 72 bytes or contains NUL".into()));
    }
    Ok(())
}

pub async fn hash_password(pw: String) -> ApiResult<String> {
    check_bcrypt_input(&pw)?;
    tokio::task::spawn_blocking(move || bcrypt::hash(pw, 12))
        .await
        .map_err(|e| ApiError::Internal(e.to_string()))?
        .map_err(|e| ApiError::Internal(format!("bcrypt hash: {e}")))
}

pub async fn verify_password(pw: String, hash: Option<String>) -> ApiResult<bool> {
    check_bcrypt_input(&pw)?;
    let hash = hash.ok_or_else(|| ApiError::Internal("user has no password hash".into()))?;
    tokio::task::spawn_blocking(move || bcrypt::verify(pw, &hash))
        .await
        .map_err(|e| ApiError::Internal(e.to_string()))?
        .map_err(|e| ApiError::Internal(format!("bcrypt verify: {e}")))
}

/// `get_current_user`: HTTPBearer -> JWT -> user row. Error order/messages match FastAPI.
pub async fn authenticate(st: &AppState, headers: &HeaderMap) -> ApiResult<User> {
    let authz = headers.get(header::AUTHORIZATION).and_then(|v| v.to_str().ok()).unwrap_or("");
    let (scheme, creds) = authz.split_once(' ').unwrap_or((authz, ""));
    if authz.is_empty() || scheme.is_empty() || creds.is_empty() || !scheme.eq_ignore_ascii_case("bearer") {
        return Err(ApiError::http(401, "Not authenticated"));
    }
    let claims = decode_claims(&st.cfg.jwt_secret, creds).ok_or_else(|| ApiError::http(401, "Invalid token"))?;
    let sub = claims
        .get("sub")
        .and_then(Value::as_str)
        .ok_or_else(|| ApiError::http(401, "Invalid token"))?;
    // int(user_id) on a non-numeric subject raises ValueError -> 500 in the old backend.
    let id: i64 = sub
        .trim()
        .parse()
        .map_err(|_| ApiError::Internal(format!("invalid literal for int(): {sub:?}")))?;
    sqlx::query_as::<_, User>(&format!("SELECT {USER_COLS} FROM users WHERE id = $1 LIMIT 1"))
        .bind(id)
        .fetch_optional(&st.pool)
        .await?
        .ok_or_else(|| ApiError::http(401, "User not found"))
}

pub async fn require_role(st: &AppState, headers: &HeaderMap, roles: &[&str]) -> ApiResult<User> {
    let user = authenticate(st, headers).await?;
    if !roles.iter().any(|r| user.role.as_deref() == Some(*r)) {
        return Err(ApiError::http(403, "Akses ditolak untuk role ini"));
    }
    Ok(user)
}

#[cfg(test)]
mod tests {
    use super::*;

    // Hash produced by Python: bcrypt.hashpw(b"rahasia-123", bcrypt.gensalt()) (bcrypt 5.0.0, $2b$).
    const PY_HASH: &str = "$2b$12$u5D3S36xqKTkdfgkfv1BEOgbEgYv3Bo0ph4osqEV86UFhwguQTEVG";

    #[test]
    fn rust_hash_roundtrip_and_prefix() {
        let h = bcrypt::hash("rahasia-123", 4).unwrap();
        assert!(h.starts_with("$2b$"));
        assert!(bcrypt::verify("rahasia-123", &h).unwrap());
        assert!(!bcrypt::verify("salah", &h).unwrap());
        // Hash written by the Python backend must verify in Rust (the drop-in guarantee).
        assert!(bcrypt::verify("rahasia-123", PY_HASH).unwrap());
        assert!(!bcrypt::verify("salah", PY_HASH).unwrap());
    }

    #[test]
    fn jwt_roundtrip_and_expiry() {
        let tok = create_access_token("s3cret", 7, Some("ADMIN"));
        let c = decode_claims("s3cret", &tok).unwrap();
        assert_eq!(c["sub"], "7");
        assert_eq!(c["role"], "ADMIN");
        assert!(decode_claims("other", &tok).is_none());
        let expired = encode_claims("s3cret", &json!({"sub": "7", "exp": now_ts() - 1}));
        assert!(decode_claims("s3cret", &expired).is_none());
        let numeric_sub = encode_claims("s3cret", &json!({"sub": 7, "exp": now_ts() + 60}));
        assert!(decode_claims("s3cret", &numeric_sub).is_none());
    }
}
