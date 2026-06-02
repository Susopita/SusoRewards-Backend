use crate::dominio::repositorios::RecompensasRepository;
use crate::dominio::entidades::{ProgramaRecompensa, Beneficio, PuntosAcumulados};
use sqlx::{Pool, Postgres, postgres::PgPoolOptions};
use async_trait::async_trait;

pub type DbPool = Pool<Postgres>;

pub async fn init_db(database_url: &str) -> DbPool {
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await
        .unwrap_or_else(|_| panic!("No se pudo conectar a CockroachDB/PostgreSQL en {}", database_url));

    let q = "
        CREATE TABLE IF NOT EXISTS programas_recompensa (
            id VARCHAR(50) PRIMARY KEY,
            empresa_id VARCHAR(50) NOT NULL,
            nombre VARCHAR(100) NOT NULL,
            regla_puntos INT NOT NULL,
            activa BOOLEAN DEFAULT true
        );
        CREATE TABLE IF NOT EXISTS beneficios (
            id VARCHAR(50) PRIMARY KEY,
            cliente_id VARCHAR(50) NOT NULL,
            empresa_id VARCHAR(50) NOT NULL,
            puntos_obtenidos INT NOT NULL,
            cashback_obtenido DOUBLE PRECISION NOT NULL,
            premio VARCHAR(100) NOT NULL,
            fecha_hora VARCHAR(50) NOT NULL
        );
        CREATE TABLE IF NOT EXISTS puntos_acumulados (
            cliente_id VARCHAR(50) NOT NULL,
            empresa_id VARCHAR(50) NOT NULL,
            puntos INT NOT NULL,
            cashback DOUBLE PRECISION NOT NULL,
            PRIMARY KEY (cliente_id, empresa_id)
        );
        CREATE TABLE IF NOT EXISTS restaurantes (
            id VARCHAR(50) PRIMARY KEY,
            code VARCHAR(50) UNIQUE NOT NULL,
            active BOOLEAN DEFAULT true
        );
        ALTER TABLE restaurantes DROP COLUMN IF EXISTS empresa_id;
        CREATE TABLE IF NOT EXISTS afiliaciones_restaurantes (
            restaurante_id VARCHAR(50) REFERENCES restaurantes(id),
            empresa_id VARCHAR(50) NOT NULL,
            PRIMARY KEY (restaurante_id, empresa_id)
        );
        CREATE TABLE IF NOT EXISTS clientes (
            id VARCHAR(50) PRIMARY KEY,
            tarjeta_cliente VARCHAR(50) UNIQUE NOT NULL,
            active BOOLEAN DEFAULT true
        );
        CREATE TABLE IF NOT EXISTS afiliaciones_clientes (
            cliente_id VARCHAR(50) REFERENCES clientes(id),
            empresa_id VARCHAR(50) NOT NULL,
            PRIMARY KEY (cliente_id, empresa_id)
        );
    ";
    
    let _ = sqlx::query(q).execute(&pool).await;
    pool
}

pub struct SqlxRecompensasRepository {
    pool: DbPool,
}

impl SqlxRecompensasRepository {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl RecompensasRepository for SqlxRecompensasRepository {
    async fn obtener_programa_activo(&self, _empresa_id: &str) -> Result<Option<ProgramaRecompensa>, String> {
        let res = sqlx::query_as::<_, ProgramaRecompensa>(
            "SELECT id, empresa_id, nombre, regla_puntos, activa FROM programas_recompensa WHERE empresa_id = $1 AND activa = true LIMIT 1"
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| e.to_string())?;
        
        Ok(res)
    }

    async fn registrar_beneficio(&self, b: &Beneficio) -> Result<(), String> {
        sqlx::query(
            "INSERT INTO beneficios (id, cliente_id, empresa_id, puntos_obtenidos, cashback_obtenido, premio, fecha_hora) VALUES ($1, $2, $3, $4, $5, $6, $7)"
        )
        .bind(&b.id)
        .bind(&b.cliente_id)
        .bind(&b.empresa_id)
        .bind(b.puntos_obtenidos)
        .bind(b.cashback_obtenido)
        .bind(&b.premio)
        .bind(&b.fecha_hora)
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn obtener_puntos_acumulados(&self, _cliente_id: &str, _empresa_id: &str) -> Result<Option<PuntosAcumulados>, String> {
        let res = sqlx::query_as::<_, PuntosAcumulados>(
            "SELECT cliente_id, empresa_id, puntos, cashback FROM puntos_acumulados WHERE cliente_id = $1 AND empresa_id = $2"
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(res)
    }

    async fn actualizar_puntos_acumulados(&self, cliente_id: &str, empresa_id: &str, puntos: i32, cashback: f64) -> Result<(), String> {
        sqlx::query(
            "INSERT INTO puntos_acumulados (cliente_id, empresa_id, puntos, cashback) VALUES ($1, $2, $3, $4) ON CONFLICT (cliente_id, empresa_id) DO UPDATE SET puntos = $3, cashback = $4"
        )
        .bind(cliente_id)
        .bind(empresa_id)
        .bind(puntos)
        .bind(cashback)
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn obtener_empresa_por_restaurante(&self, _codigo_restaurante: &str, _tarjeta_cliente: &str) -> Result<Option<String>, String> {
        let res: Option<(String,)> = sqlx::query_as(
            "SELECT ar.empresa_id \
             FROM afiliaciones_restaurantes ar \
             JOIN restaurantes r ON r.id = ar.restaurante_id \
             JOIN afiliaciones_clientes ac ON ac.empresa_id = ar.empresa_id \
             JOIN clientes c ON c.id = ac.cliente_id \
             WHERE r.code = $1 AND c.tarjeta_cliente = $2 AND r.active = true AND c.active = true \
             LIMIT 1"
        )
        .bind(_codigo_restaurante)
        .bind(_tarjeta_cliente)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(res.map(|r| r.0))
    }

    async fn validar_cliente_afiliacion(&self, _tarjeta_cliente: &str, _empresa_id: &str) -> Result<Option<String>, String> {
        let res: Option<(String,)> = sqlx::query_as(
            "SELECT c.id FROM clientes c JOIN afiliaciones_clientes ac ON c.id = ac.cliente_id WHERE c.tarjeta_cliente = $1 AND ac.empresa_id = $2 AND c.active = true"
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(res.map(|r| r.0))
    }
}
