use serde::{Serialize, Deserialize};

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct ProgramaRecompensa {
    pub id: String,
    pub empresa_id: String,
    pub nombre: String,
    pub regla_puntos: i32,
    pub activa: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct Beneficio {
    pub id: String,
    pub cliente_id: String,
    pub empresa_id: String,
    pub puntos_obtenidos: i32,
    pub cashback_obtenido: f64,
    pub premio: String,
    pub fecha_hora: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct PuntosAcumulados {
    pub cliente_id: String,
    pub empresa_id: String,
    pub puntos: i32,
    pub cashback: f64,
}
