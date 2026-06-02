use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub port: u16,
    pub database_url: String,
    pub kafka_brokers: String,
}

impl Config {
    pub fn from_env() -> Self {
        let port = env::var("PORT")
            .unwrap_or_else(|_| "3002".to_string())
            .parse::<u16>()
            .unwrap_or(3002);

        let database_url = env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgresql://root@localhost:26257/susorewards_recompensas?sslmode=disable".to_string());

        let kafka_brokers = env::var("KAFKA_BROKERS")
            .unwrap_or_else(|_| "localhost:29092".to_string());

        Config {
            port,
            database_url,
            kafka_brokers,
        }
    }
}
