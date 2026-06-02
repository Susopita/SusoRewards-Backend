use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Notificacion {
    pub id: String,
    pub cliente_id: String,
    pub mensaje: String,
    pub leido: bool,
    pub fecha_creacion: i64,
}
