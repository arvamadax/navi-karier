//! Backend NaviKarier (Rust). Rute, bentuk JSON, status code, dan skema Postgres identik dengan
//! backend Python lama (tag git `python-backend-final`). Skema dibuat saat start dari `schema.sql`.

pub mod analysis;
pub mod auth;
pub mod db;
pub mod email;
pub mod error;
pub mod handlers;
pub mod pdf;
pub mod pyjson;
pub mod validate;

use std::{sync::Arc, time::Duration};

use axum::{
    extract::DefaultBodyLimit,
    http::{HeaderValue, StatusCode},
    routing::{delete, get, post, put},
    Json, Router,
};
use serde_json::json;
use sqlx::PgPool;
use tower_http::cors::{AllowHeaders, AllowMethods, AllowOrigin, CorsLayer};

/// Env-driven settings; names and defaults are identical to the Python backend.
#[derive(Debug, Clone)]
pub struct Config {
    pub jwt_secret: String,
    pub oauth_secret: String,
    pub anthropic_key: Option<String>,
    pub resend_key: String,
    pub from_email: String,
    pub contact_email: String,
    pub frontend_url: String,
    pub cors_origins: Vec<String>,
}

impl Config {
    pub fn from_env() -> Self {
        let get = |k: &str, d: &str| std::env::var(k).unwrap_or_else(|_| d.to_string());
        Config {
            jwt_secret: get("JWT_SECRET", "navikarier-dev-jwt-secret-change-in-production"),
            oauth_secret: get("OAUTH_BRIDGE_SECRET", "navikarier-oauth-bridge-dev"),
            anthropic_key: std::env::var("ANTHROPIC_API_KEY").ok().filter(|v| !v.is_empty()),
            resend_key: get("RESEND_API_KEY", ""),
            from_email: get("FROM_EMAIL", "NaviKarier <noreply@navikarier.com>"),
            contact_email: get("CONTACT_EMAIL", "hello@navikarier.id"),
            frontend_url: get("FRONTEND_URL", "http://localhost:3000"),
            cors_origins: get("CORS_ORIGINS", "http://localhost:3000").split(',').map(String::from).collect(),
        }
    }
}

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub cfg: Arc<Config>,
    pub http: reqwest::Client,
}

impl AppState {
    pub fn new(pool: PgPool, cfg: Config) -> Self {
        let http = reqwest::Client::builder()
            .timeout(Duration::from_secs(120))
            .build()
            .expect("reqwest client");
        AppState { pool, cfg: Arc::new(cfg), http }
    }
}

async fn not_found() -> (StatusCode, Json<serde_json::Value>) {
    (StatusCode::NOT_FOUND, Json(json!({"detail": "Not Found"})))
}
async fn method_not_allowed() -> (StatusCode, Json<serde_json::Value>) {
    (StatusCode::METHOD_NOT_ALLOWED, Json(json!({"detail": "Method Not Allowed"})))
}

pub fn router(state: AppState) -> Router {
    use handlers::*;

    // allow_credentials + "*" is rejected by CORS: list Starlette's methods, mirror the request headers.
    let origins: Vec<HeaderValue> = state.cfg.cors_origins.iter().filter_map(|o| o.parse().ok()).collect();
    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::list(origins))
        .allow_credentials(true)
        .allow_methods(AllowMethods::list(
            ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT", "QUERY"]
                .map(|m| axum::http::Method::from_bytes(m.as_bytes()).unwrap()),
        ))
        .allow_headers(AllowHeaders::mirror_request())
        .max_age(Duration::from_secs(600));

    Router::new()
        .route("/", get(read_root))
        .route("/api/health", get(health_check))
        // Auth
        .route("/api/auth/register", post(register))
        .route("/api/auth/login", post(login))
        .route("/api/auth/me", get(me))
        .route("/api/auth/profile", put(update_profile))
        .route("/api/auth/password", put(change_password))
        .route("/api/auth/forgot-password", post(forgot_password))
        .route("/api/auth/reset-password", post(reset_password))
        .route("/api/auth/oauth", post(oauth))
        // CV + analysis
        .route("/api/upload-cv", post(upload_cv))
        .route("/api/analyze-gap", post(analyze_gap))
        .route("/api/recommendations/{analysis_id}", get(get_recommendations))
        // Dashboard
        .route("/api/dashboard/overview", get(dashboard_overview))
        .route("/api/dashboard/history", get(analysis_history))
        .route("/api/contact", post(contact))
        // Admin
        .route("/api/admin/overview", get(admin_overview))
        .route("/api/admin/users", get(admin_users))
        // Company
        .route("/api/company/overview", get(company_overview))
        .route("/api/company/talent", get(company_talent))
        .route("/api/company/roles", post(create_role).get(list_roles))
        .route("/api/company/roles/{role_id}", delete(delete_role))
        .route("/api/company/invites", post(create_invite).get(list_invites))
        // Public invite flow
        .route("/api/invite/{token}", get(get_invite))
        .route("/api/invite/{token}/submit", post(submit_invite))
        .method_not_allowed_fallback(method_not_allowed)
        .fallback(not_found)
        // CV uploads: Starlette imposes no overall limit; keep a generous cap instead of 2 MB.
        .layer(DefaultBodyLimit::max(50 * 1024 * 1024))
        .layer(cors)
        .with_state(state)
}
