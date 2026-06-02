use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpListener;
use recompensas::infraestructura::config::Config;
use recompensas::infraestructura::database::{init_db, SqlxRecompensasRepository};
use recompensas::infraestructura::web::build_router;
use recompensas::infraestructura::kafka::{start_kafka_consumer, KafkaEventPublisher};

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();
    let config = Config::from_env();

    println!("Iniciando microservicio de Recompensas...");

    let db_pool = init_db(&config.database_url).await;
    println!("Conexión a CockroachDB/PostgreSQL establecida.");

    let repo = Arc::new(SqlxRecompensasRepository::new(db_pool.clone()));
    let publisher = Arc::new(KafkaEventPublisher::new(&config.kafka_brokers));

    start_kafka_consumer(&config.kafka_brokers, repo, publisher).await;

    let app = build_router(db_pool);

    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    println!("Servidor de recompensas escuchando en http://{}", addr);

    let listener = TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
