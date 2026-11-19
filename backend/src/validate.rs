//! Minimal re-implementation of the pydantic v2 / FastAPI request validation that the
//! old backend performed, including its 422 error bodies.

use axum::http::{header, HeaderMap};
use serde_json::{json, Map, Value};

use crate::error::{validation_item, ApiError, ApiResult};

#[derive(Clone, Copy, PartialEq)]
pub enum Ty {
    Str,
    OptStr,
    Int,
}

pub struct Spec {
    pub name: &'static str,
    pub ty: Ty,
    /// `None` + `Ty::Str`/`Ty::Int` => required field. A default makes it optional.
    pub default: Option<&'static str>,
}

pub const fn req(name: &'static str, ty: Ty) -> Spec {
    Spec { name, ty, default: None }
}
pub const fn opt(name: &'static str) -> Spec {
    Spec { name, ty: Ty::OptStr, default: None }
}
pub const fn def(name: &'static str, default: &'static str) -> Spec {
    Spec { name, ty: Ty::Str, default: Some(default) }
}

/// A validated model: defaults applied, `provided` = keys explicitly present in the body.
pub struct Model {
    pub values: Map<String, Value>,
    pub provided: Vec<&'static str>,
}

impl Model {
    pub fn str(&self, k: &str) -> String {
        self.values.get(k).and_then(Value::as_str).unwrap_or_default().to_string()
    }
    pub fn opt_str(&self, k: &str) -> Option<String> {
        self.values.get(k).and_then(Value::as_str).map(str::to_string)
    }
    pub fn int(&self, k: &str) -> i64 {
        self.values.get(k).and_then(Value::as_i64).unwrap_or_default()
    }
}

/// Parse a request body the way FastAPI does. `None` = no body at all.
pub fn json_body(headers: &HeaderMap, body: &[u8]) -> ApiResult<Option<Value>> {
    if body.is_empty() {
        return Ok(None);
    }
    if let Some(ct) = headers.get(header::CONTENT_TYPE).and_then(|v| v.to_str().ok()) {
        let mime = ct.split(';').next().unwrap_or("").trim().to_ascii_lowercase();
        let is_json = mime
            .strip_prefix("application/")
            .is_some_and(|sub| sub == "json" || sub.ends_with("+json"));
        if !is_json {
            return Ok(Some(Value::String(String::from_utf8_lossy(body).into_owned())));
        }
    }
    match serde_json::from_slice::<Value>(body) {
        Ok(v) => Ok(Some(v)),
        Err(e) => {
            let msg = e.to_string();
            let reason = if msg.contains("trailing characters") {
                "Extra data"
            } else if msg.contains("key must be a string") {
                "Expecting property name enclosed in double quotes"
            } else {
                "Expecting value"
            };
            // serde reports 1-based line/column; Python reports a character offset.
            let (line, col) = (e.line(), e.column());
            let text = String::from_utf8_lossy(body);
            let offset = text
                .split_inclusive('\n')
                .take(line.saturating_sub(1))
                .map(|l| l.chars().count())
                .sum::<usize>()
                + col.saturating_sub(1);
            let mut item = validation_item("json_invalid", vec![json!("body"), json!(offset)], "JSON decode error", json!({}));
            item["ctx"] = json!({ "error": reason });
            Err(ApiError::Validation(vec![item]))
        }
    }
}

fn coerce_int(v: &Value) -> Result<i64, (&'static str, &'static str)> {
    match v {
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                Ok(i)
            } else if let Some(f) = n.as_f64().filter(|f| f.is_finite() && f.abs() < 9.2e18) {
                if f.fract() == 0.0 {
                    Ok(f as i64)
                } else {
                    Err(("int_from_float", "Input should be a valid integer, got a number with a fractional part"))
                }
            } else {
                Err(("int_parsing_size", "Unable to parse input string as an integer, exceeds maximum size"))
            }
        }
        Value::Bool(b) => Ok(*b as i64),
        Value::String(s) => s
            .trim()
            .parse::<i64>()
            .map_err(|_| ("int_parsing", "Input should be a valid integer, unable to parse string as an integer")),
        _ => Err(("int_type", "Input should be a valid integer")),
    }
}

/// Validate a JSON body against a model spec (pydantic lax mode).
pub fn model(body: Option<Value>, specs: &[Spec]) -> ApiResult<Model> {
    let Some(body) = body else {
        return Err(ApiError::Validation(vec![validation_item("missing", vec![json!("body")], "Field required", Value::Null)]));
    };
    let Value::Object(obj) = &body else {
        return Err(ApiError::Validation(vec![validation_item(
            "model_attributes_type",
            vec![json!("body")],
            "Input should be a valid dictionary or object to extract fields from",
            body.clone(),
        )]));
    };

    let mut errors = vec![];
    let mut values = Map::new();
    let mut provided = vec![];
    for spec in specs {
        let loc = vec![json!("body"), json!(spec.name)];
        match obj.get(spec.name) {
            None => match (spec.ty, spec.default) {
                (Ty::OptStr, _) => {
                    values.insert(spec.name.into(), Value::Null);
                }
                (_, Some(d)) => {
                    values.insert(spec.name.into(), Value::String(d.into()));
                }
                _ => errors.push(validation_item("missing", loc, "Field required", body.clone())),
            },
            Some(v) => {
                provided.push(spec.name);
                match spec.ty {
                    Ty::Str | Ty::OptStr if v.is_string() => {
                        values.insert(spec.name.into(), v.clone());
                    }
                    Ty::OptStr if v.is_null() => {
                        values.insert(spec.name.into(), Value::Null);
                    }
                    Ty::Str | Ty::OptStr => {
                        errors.push(validation_item("string_type", loc, "Input should be a valid string", v.clone()))
                    }
                    Ty::Int => match coerce_int(v) {
                        Ok(i) => {
                            values.insert(spec.name.into(), json!(i));
                        }
                        Err((kind, msg)) => errors.push(validation_item(kind, loc, msg, v.clone())),
                    },
                }
            }
        }
    }
    if errors.is_empty() {
        Ok(Model { values, provided })
    } else {
        Err(ApiError::Validation(errors))
    }
}

/// `analysis_id: int` style path parameter (validated *after* auth, like FastAPI).
pub fn path_int(name: &str, raw: &str) -> ApiResult<i64> {
    coerce_int(&Value::String(raw.to_string())).map_err(|(kind, msg)| {
        ApiError::Validation(vec![validation_item(kind, vec![json!("path"), json!(name)], msg, Value::String(raw.to_string()))])
    })
}

pub fn missing_body_field(name: &str) -> Value {
    validation_item("missing", vec![json!("body"), json!(name)], "Field required", Value::Null)
}
