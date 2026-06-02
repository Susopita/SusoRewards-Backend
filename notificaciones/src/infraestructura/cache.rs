use crate::dominio::repositorios::CacheRepository;
use crate::dominio::entidades::Notificacion;
use redis::{Client, AsyncCommands};
use async_trait::async_trait;

pub struct RedisCacheManager {
    client: Client,
}

impl RedisCacheManager {
    pub fn new(redis_url: &str) -> Self {
        let client = Client::open(redis_url).expect("No se pudo conectar a Redis");
        Self { client }
    }
}

#[async_trait]
impl CacheRepository for RedisCacheManager {
    async fn guardar_notificacion(&self, notif: &Notificacion) -> Result<(), String> {
        let mut conn = self.client.get_multiplexed_tokio_connection()
            .await
            .map_err(|e| e.to_string())?;

        let key = format!("notif:{}", notif.cliente_id);
        let val = serde_json::to_string(notif).map_err(|e| e.to_string())?;

        conn.lpush::<_, _, ()>(&key, &val).await.map_err(|e| e.to_string())?;
        conn.ltrim::<_, ()>(&key, 0, 49).await.map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn obtener_notificaciones(&self, cliente_id: &str) -> Result<Vec<Notificacion>, String> {
        let mut conn = self.client.get_multiplexed_tokio_connection()
            .await
            .map_err(|e| e.to_string())?;

        let key = format!("notif:{}", cliente_id);
        let raw_list: Vec<String> = conn.lrange(&key, 0, -1).await.map_err(|e| e.to_string())?;

        let mut list = Vec::new();
        for item in raw_list {
            if let Ok(notif) = serde_json::from_str::<Notificacion>(&item) {
                list.push(notif);
            }
        }

        Ok(list)
    }
}
