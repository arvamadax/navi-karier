use navikarier::{router, AppState, Config};
use sqlx::postgres::PgPoolOptions;

/// SQLAlchemy URLs may carry a driver suffix (`postgresql+psycopg2://`); sqlx wants plain `postgres://`.
fn normalize_database_url(raw: &str) -> String {
    match raw.split_once("://") {
        Some((scheme, rest)) => format!("{}://{rest}", scheme.split('+').next().unwrap_or(scheme)),
        None => raw.to_string(),
    }
}

#[tokio::main]
async fn main() {
    let url = match std::env::var("DATABASE_URL") {
        Ok(v) if v.starts_with("postgres") => normalize_database_url(&v),
        Ok(v) => {
            eprintln!("DATABASE_URL must be a PostgreSQL URL (got scheme {:?}); sqlite is not supported", v.split("://").next());
            std::process::exit(1);
        }
        Err(_) => {
            eprintln!("DATABASE_URL is not set");
            std::process::exit(1);
        }
    };

    // Same pool shape as the Python engine: pool_size=5, max_overflow=10.
    let pool = PgPoolOptions::new()
        .max_connections(15)
        .acquire_timeout(std::time::Duration::from_secs(30))
        .connect_lazy(&url)
        .expect("invalid DATABASE_URL");

    let state = AppState::new(pool, Config::from_env());
    let addr = format!(
        "{}:{}",
        std::env::var("BIND").unwrap_or_else(|_| "0.0.0.0".into()),
        std::env::var("PORT").unwrap_or_else(|_| "8000".into())
    );
    let listener = tokio::net::TcpListener::bind(&addr).await.expect("bind");
    println!("NaviKarier API (rust) listening on http://{addr}");
    axum::serve(listener, router(state))
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
        })
        .await
        .expect("server");
}
