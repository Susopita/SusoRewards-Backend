use axum::{Router, routing::get, Json, extract::{Path, State}};
use serde_json::{json, Value};
use std::sync::Arc;
use crate::infraestructura::database::DbPool;
use crate::dominio::repositorios::RecompensasRepository;
use crate::infraestructura::database::SqlxRecompensasRepository;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[derive(Clone)]
pub struct AppState {
    pub repo: Arc<dyn RecompensasRepository>,
}

pub fn build_router(db_pool: DbPool) -> Router {
    let repo = Arc::new(SqlxRecompensasRepository::new(db_pool));
    let state = AppState { repo };
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .init();

    Router::new()
        .route("/health", get(health_handler))
        .route("/puntos/:cliente_id/:empresa_id", get(obtener_puntos_handler))
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

async fn health_handler() -> Json<Value> {
    Json(json!({
        "status": "OK",
        "service": "recompensas"
    }))
}

async fn obtener_puntos_handler(
    Path((cliente_id, empresa_id)): Path<(String, String)>,
    State(state): State<AppState>,
) -> Json<Value> {
    match state.repo.obtener_puntos_acumulados(&cliente_id, &empresa_id).await {
        Ok(Some(puntos)) => Json(json!({
            "cliente_id": puntos.cliente_id,
            "empresa_id": puntos.empresa_id,
            "puntos": puntos.puntos,
            "cashback": puntos.cashback
        })),
        Ok(None) => Json(json!({
            "cliente_id": cliente_id,
            "empresa_id": empresa_id,
            "puntos": 0,
            "cashback": 0.0
        })),
        Err(e) => Json(json!({ "error": e }))
    }
}
