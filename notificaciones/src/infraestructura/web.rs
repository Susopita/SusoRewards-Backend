use axum::{
    response::sse::{Event, KeepAlive, Sse},
    routing::get,
    Router, Json, extract::State
};
use std::convert::Infallible;
use tokio::sync::broadcast;
use tokio_stream::Stream;
use tokio_stream::StreamExt;
use tokio_stream::wrappers::BroadcastStream;
use serde_json::{json, Value};
use std::sync::Arc;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use crate::dominio::repositorios::CacheRepository;

#[derive(Clone)]
pub struct AppState {
    pub tx: broadcast::Sender<String>,
    #[allow(dead_code)]
    pub cache_repo: Arc<dyn CacheRepository>,
}

pub fn build_router(tx: broadcast::Sender<String>, cache_repo: Arc<dyn CacheRepository>) -> Router {
    let state = AppState { tx, cache_repo };
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .init();

    Router::new()
        .route("/health", get(health_handler))
        .route("/sse", get(sse_handler))
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

async fn health_handler() -> Json<Value> {
    Json(json!({
        "status": "OK",
        "service": "notificaciones"
    }))
}

async fn sse_handler(
    State(state): State<AppState>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let rx = state.tx.subscribe();
    
    let stream = BroadcastStream::new(rx)
        .filter_map(|msg| {
            match msg {
                Ok(text) => Some(Ok(Event::default().data(text))),
                Err(_) => None,
            }
        });

    Sse::new(stream).keep_alive(KeepAlive::default())
}
