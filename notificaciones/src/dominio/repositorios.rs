use crate::dominio::entidades::Notificacion;
use async_trait::async_trait;

#[async_trait]
pub trait CacheRepository: Send + Sync {
    async fn guardar_notificacion(&self, notif: &Notificacion) -> Result<(), String>;
    #[allow(dead_code)]
    async fn obtener_notificaciones(&self, cliente_id: &str) -> Result<Vec<Notificacion>, String>;
}
