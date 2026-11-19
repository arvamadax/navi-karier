//! Error type that renders exactly like FastAPI's error responses.

use axum::{
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde_json::{json, Value};

#[derive(Debug)]
pub enum ApiError {
    /// `HTTPException(status, detail)` -> `{"detail": "<msg>"}`
    Http(StatusCode, String),
    /// `RequestValidationError` -> 422 `{"detail": [ ... ]}`
    Validation(Vec<Value>),
    /// Uncaught exception -> Starlette's plain-text 500.
    Internal(String),
}

pub type ApiResult<T> = Result<T, ApiError>;

impl ApiError {
    pub fn http(status: u16, detail: &str) -> Self {
        ApiError::Http(StatusCode::from_u16(status).unwrap(), detail.to_string())
    }
}

impl From<sqlx::Error> for ApiError {
    fn from(e: sqlx::Error) -> Self {
        ApiError::Internal(format!("database error: {e}"))
    }
}

pub fn validation_item(kind: &str, loc: Vec<Value>, msg: &str, input: Value) -> Value {
    json!({
        "type": kind,
        "loc": loc,
        "msg": msg,
        "input": input,
    })
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        match self {
            ApiError::Http(status, detail) => (status, Json(json!({ "detail": detail }))).into_response(),
            ApiError::Validation(items) => {
                (StatusCode::UNPROCESSABLE_ENTITY, Json(json!({ "detail": items }))).into_response()
            }
            ApiError::Internal(msg) => {
                eprintln!("[ERROR] {msg}");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    [(header::CONTENT_TYPE, "text/plain; charset=utf-8")],
                    "Internal Server Error",
                )
                    .into_response()
            }
        }
    }
}
