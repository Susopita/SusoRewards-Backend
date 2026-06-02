use recompensas::aplicacion::casos_de_uso::ProcesarConsumo;
use recompensas::dominio::repositorios::RecompensasRepository;
use recompensas::dominio::eventos::EventPublisher;
use recompensas::dominio::entidades::{ProgramaRecompensa, PuntosAcumulados, Beneficio};
use std::sync::{Arc, Mutex};
use async_trait::async_trait;

struct MockRepo {
    programa: Mutex<Option<ProgramaRecompensa>>,
    puntos: Mutex<Option<PuntosAcumulados>>,
    empresa_id: String,
    cliente_id: String,
}

#[async_trait]
impl RecompensasRepository for MockRepo {
    async fn obtener_programa_activo(&self, _empresa_id: &str) -> Result<Option<ProgramaRecompensa>, String> {
        Ok(self.programa.lock().unwrap().clone())
    }
    async fn registrar_beneficio(&self, _beneficio: &Beneficio) -> Result<(), String> {
        Ok(())
    }
    async fn obtener_puntos_acumulados(&self, _cliente_id: &str, _empresa_id: &str) -> Result<Option<PuntosAcumulados>, String> {
        Ok(self.puntos.lock().unwrap().clone())
    }
    async fn actualizar_puntos_acumulados(&self, _cliente_id: &str, _empresa_id: &str, puntos: i32, cashback: f64) -> Result<(), String> {
        *self.puntos.lock().unwrap() = Some(PuntosAcumulados {
            cliente_id: self.cliente_id.clone(),
            empresa_id: self.empresa_id.clone(),
            puntos,
            cashback,
        });
        Ok(())
    }
    async fn obtener_empresa_por_restaurante(&self, code: &str, tarjeta: &str) -> Result<Option<String>, String> {
        if code == "INVALID" || tarjeta == "INVALID" {
            Ok(None)
        } else {
            Ok(Some(self.empresa_id.clone()))
        }
    }
    async fn validar_cliente_afiliacion(&self, tarjeta: &str, _empresa_id: &str) -> Result<Option<String>, String> {
        if tarjeta == "INVALID" {
            Ok(None)
        } else {
            Ok(Some(self.cliente_id.clone()))
        }
    }
}

struct MockPublisher {
    published: Mutex<Vec<Beneficio>>,
}

#[async_trait]
impl EventPublisher for MockPublisher {
    async fn publicar_beneficio_otorgado(&self, beneficio: &Beneficio) -> Result<(), String> {
        self.published.lock().unwrap().push(beneficio.clone());
        Ok(())
    }
}

#[tokio::test]
async fn test_procesar_consumo_exitoso() {
    let repo = Arc::new(MockRepo {
        programa: Mutex::new(Some(ProgramaRecompensa {
            id: "prog-1".to_string(),
            empresa_id: "emp-1".to_string(),
            nombre: "Programa Alfa".to_string(),
            regla_puntos: 2,
            activa: true,
        })),
        puntos: Mutex::new(None),
        empresa_id: "emp-1".to_string(),
        cliente_id: "cli-1".to_string(),
    });

    let publisher = Arc::new(MockPublisher {
        published: Mutex::new(Vec::new()),
    });

    let caso_uso = ProcesarConsumo::new(repo.clone(), publisher.clone());
    let res = caso_uso.ejecutar(120.0, "CARD-123", "REST-01", "2026-05-30T20:00:00Z").await;

    assert!(res.is_ok());
    let beneficio = res.unwrap();
    assert_eq!(beneficio.puntos_obtenidos, 240);
    assert_eq!(beneficio.premio, "Postre Gratis");

    let puntos_guardados = repo.puntos.lock().unwrap().clone().unwrap();
    assert_eq!(puntos_guardados.puntos, 240);

    assert_eq!(publisher.published.lock().unwrap().len(), 1);
}

#[tokio::test]
async fn test_procesar_consumo_restaurante_invalido() {
    let repo = Arc::new(MockRepo {
        programa: Mutex::new(None),
        puntos: Mutex::new(None),
        empresa_id: "emp-1".to_string(),
        cliente_id: "cli-1".to_string(),
    });
    let publisher = Arc::new(MockPublisher { published: Mutex::new(Vec::new()) });
    let caso_uso = ProcesarConsumo::new(repo, publisher);
    let res = caso_uso.ejecutar(120.0, "CARD-123", "INVALID", "2026-05-30T20:00:00Z").await;
    assert!(res.is_err());
    assert_eq!(res.err().unwrap(), "Restaurante no participante o deshabilitado para este cliente");
}
