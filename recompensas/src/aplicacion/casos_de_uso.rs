use crate::dominio::entidades::Beneficio;
use crate::dominio::repositorios::RecompensasRepository;
use crate::dominio::eventos::EventPublisher;
use std::sync::Arc;

pub struct ProcesarConsumo {
    repo: Arc<dyn RecompensasRepository>,
    publisher: Arc<dyn EventPublisher>,
}

impl ProcesarConsumo {
    pub fn new(repo: Arc<dyn RecompensasRepository>, publisher: Arc<dyn EventPublisher>) -> Self {
        Self { repo, publisher }
    }

    pub async fn ejecutar(
        &self,
        monto: f64,
        tarjeta_cliente: &str,
        codigo_restaurante: &str,
        fecha_hora: &str,
    ) -> Result<Beneficio, String> {
        let empresa_id = self.repo.obtener_empresa_por_restaurante(codigo_restaurante, tarjeta_cliente).await?
            .ok_or_else(|| "Restaurante no participante o deshabilitado para este cliente".to_string())?;

        let cliente_id = self.repo.validar_cliente_afiliacion(tarjeta_cliente, &empresa_id).await?
            .ok_or_else(|| "Cliente no afiliado a esta empresa o deshabilitado".to_string())?;

        let programa = self.repo.obtener_programa_activo(&empresa_id).await?
            .ok_or_else(|| "La empresa no tiene un programa de recompensas activo".to_string())?;

        let puntos_obtenidos = (monto * programa.regla_puntos as f64).floor() as i32;
        // El cashback es fijo al 5% por regla de negocio general.
        let cashback_obtenido = monto * 0.05;
        let premio = if puntos_obtenidos >= 100 { "Postre Gratis" } else { "Ninguno" };

        let beneficio = Beneficio {
            id: format!("ben-{}", uuid_like_generator()),
            cliente_id: cliente_id.clone(),
            empresa_id: empresa_id.clone(),
            puntos_obtenidos,
            cashback_obtenido,
            premio: premio.to_string(),
            fecha_hora: fecha_hora.to_string(),
        };

        self.repo.registrar_beneficio(&beneficio).await?;

        let saldo_actual = self.repo.obtener_puntos_acumulados(&cliente_id, &empresa_id).await?;
        let (nuevos_puntos, nuevo_cashback) = match saldo_actual {
            Some(s) => (s.puntos + puntos_obtenidos, s.cashback + cashback_obtenido),
            None => (puntos_obtenidos, cashback_obtenido),
        };
        self.repo.actualizar_puntos_acumulados(&cliente_id, &empresa_id, nuevos_puntos, nuevo_cashback).await?;

        self.publisher.publicar_beneficio_otorgado(&beneficio).await?;

        Ok(beneficio)
    }
}

fn uuid_like_generator() -> String {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_micros();
    format!("{:x}", now)
}


