use async_trait::async_trait;
use crate::dominio::entidades::Beneficio;

#[async_trait]
pub trait EventPublisher: Send + Sync {
    async fn publicar_beneficio_otorgado(&self, beneficio: &Beneficio) -> Result<(), String>;
}
