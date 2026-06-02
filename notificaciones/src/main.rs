use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpListener;
use notificaciones::infraestructura::config::Config;
use notificaciones::infraestructura::cache::RedisCacheManager;
use notificaciones::infraestructura::web::build_router;
use notificaciones::infraestructura::kafka::start_kafka_consumer;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    let config = Config::from_env();

    println!("Iniciando microservicio de Notificaciones...");

    let cache_repo = Arc::new(RedisCacheManager::new(&config.redis_url));
    println!("Conexión a Redis configurada en {}", config.redis_url);

    let (tx, _rx) = tokio::sync::broadcast::channel::<String>(100);

    start_kafka_consumer(&config.kafka_brokers, cache_repo.clone(), tx.clone()).await;

    let app = build_router(tx, cache_repo);

    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    println!("Servidor de notificaciones escuchando en http://{}", addr);

    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
