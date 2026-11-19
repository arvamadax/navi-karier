//! Row types for the tables owned by Alembic / `backend/app/models.py`.
//! Rust never creates or alters schema; it only reads and writes rows.

use chrono::{NaiveDateTime, Timelike};
use serde_json::Value;
use sqlx::FromRow;

pub const USER_COLS: &str = "id, name, email, password_hash, role, phone, bio, target_role, experience_level, created_at";
pub const ANALYSIS_COLS: &str =
    "id, match_score, target_role, level, missing_skills, skill_details, recommended_courses, user_id, created_at";
pub const ROLE_COLS: &str = "id, user_id, title, level, required_skills, created_at";
pub const INVITE_COLS: &str =
    "id, user_id, token, target_role, level, candidate_email, candidate_name, status, created_at";

#[derive(Debug, Clone, FromRow)]
pub struct User {
    pub id: i32,
    pub name: Option<String>,
    pub email: Option<String>,
    pub password_hash: Option<String>,
    pub role: Option<String>,
    pub phone: Option<String>,
    pub bio: Option<String>,
    pub target_role: Option<String>,
    pub experience_level: Option<String>,
    pub created_at: Option<NaiveDateTime>,
}

#[derive(Debug, Clone, FromRow)]
pub struct Analysis {
    pub id: i32,
    pub match_score: Option<f64>,
    pub target_role: Option<String>,
    pub level: Option<String>,
    pub missing_skills: Option<String>,
    pub skill_details: Option<String>,
    pub recommended_courses: Option<String>,
    pub user_id: Option<i32>,
    pub created_at: Option<NaiveDateTime>,
}

#[derive(Debug, Clone, FromRow)]
pub struct JobRole {
    pub id: i32,
    pub user_id: Option<i32>,
    pub title: Option<String>,
    pub level: Option<String>,
    pub required_skills: Option<String>,
    pub created_at: Option<NaiveDateTime>,
}

#[derive(Debug, Clone, FromRow)]
pub struct Invite {
    pub id: i32,
    pub user_id: Option<i32>,
    pub token: Option<String>,
    pub target_role: Option<String>,
    pub level: Option<String>,
    pub candidate_email: Option<String>,
    pub candidate_name: Option<String>,
    pub status: Option<String>,
    pub created_at: Option<NaiveDateTime>,
}

/// `datetime.isoformat()` of a naive datetime: microseconds only when non-zero.
pub fn iso(dt: Option<NaiveDateTime>) -> Value {
    match dt {
        None => Value::Null,
        Some(d) => {
            let base = d.format("%Y-%m-%dT%H:%M:%S").to_string();
            let micros = d.nanosecond() / 1000;
            Value::String(if micros == 0 { base } else { format!("{base}.{micros:06}") })
        }
    }
}

/// `datetime.now(timezone.utc)` stored in a `timestamp without time zone` column.
pub fn now_utc() -> NaiveDateTime {
    chrono::Utc::now().naive_utc()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn isoformat_matches_python() {
        let d = chrono::NaiveDate::from_ymd_opt(2026, 6, 17).unwrap().and_hms_micro_opt(17, 13, 11, 694459).unwrap();
        assert_eq!(iso(Some(d)), "2026-06-17T17:13:11.694459");
        let d0 = chrono::NaiveDate::from_ymd_opt(2026, 6, 17).unwrap().and_hms_opt(17, 13, 11).unwrap();
        assert_eq!(iso(Some(d0)), "2026-06-17T17:13:11");
        assert_eq!(iso(None), Value::Null);
    }
}
