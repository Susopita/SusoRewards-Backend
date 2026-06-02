use crate::dominio::entidades::{ProgramaRecompensa, Beneficio, PuntosAcumulados};
use async_trait::async_trait;

#[async_trait]
pub trait RecompensasRepository: Send + Sync {
    async fn obtener_programa_activo(&self, empresa_id: &str) -> Result<Option<ProgramaRecompensa>, String>;
    async fn registrar_beneficio(&self, beneficio: &Beneficio) -> Result<(), String>;
    async fn obtener_puntos_acumulados(&self, cliente_id: &str, empresa_id: &str) -> Result<Option<PuntosAcumulados>, String>;
    async fn actualizar_puntos_acumulados(&self, cliente_id: &str, empresa_id: &str, puntos: i32, cashback: f64) -> Result<(), String>;
    
    // Validaciones
    async fn obtener_empresa_por_restaurante(&self, codigo_restaurante: &str, tarjeta_cliente: &str) -> Result<Option<String>, String>;
    async fn validar_cliente_afiliacion(&self, tarjeta_cliente: &str, empresa_id: &str) -> Result<Option<String>, String>; // Devuelve cliente_id si es válido
}
