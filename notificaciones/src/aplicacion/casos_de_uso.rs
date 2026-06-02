use crate::dominio::entidades::Notificacion;
use crate::dominio::repositorios::CacheRepository;
use std::sync::Arc;

pub struct ProcesarNotificacion {
    cache_repo: Arc<dyn CacheRepository>,
}

impl ProcesarNotificacion {
    pub fn new(cache_repo: Arc<dyn CacheRepository>) -> Self {
        Self { cache_repo }
    }

    pub async fn ejecutar(&self, cliente_id: &str, premio: &str) -> Result<Notificacion, String> {
        let mensaje = format!("¡Felicidades! Has recibido el beneficio: {}", premio);
        let id = format!("notif-{}", timestamp_micro());

        let notif = Notificacion {
            id,
            cliente_id: cliente_id.to_string(),
            mensaje,
            leido: false,
            fecha_creacion: (timestamp_micro() / 1_000_000) as i64,
        };

        self.cache_repo.guardar_notificacion(&notif).await?;
        Ok(notif)
    }

    #[allow(dead_code)]
    pub async fn obtener_para_cliente(&self, cliente_id: &str) -> Result<Vec<Notificacion>, String> {
        self.cache_repo.obtener_notificaciones(cliente_id).await
    }
}

fn timestamp_micro() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_micros()
}


