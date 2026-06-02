use notificaciones::aplicacion::casos_de_uso::ProcesarNotificacion;
use notificaciones::dominio::repositorios::CacheRepository;
use notificaciones::dominio::entidades::Notificacion;
use std::sync::{Arc, Mutex};
use async_trait::async_trait;

struct MockCacheRepo {
    notifs: Mutex<Vec<Notificacion>>,
}

#[async_trait]
impl CacheRepository for MockCacheRepo {
    async fn guardar_notificacion(&self, notif: &Notificacion) -> Result<(), String> {
        self.notifs.lock().unwrap().push(notif.clone());
        Ok(())
    }

    async fn obtener_notificaciones(&self, cliente_id: &str) -> Result<Vec<Notificacion>, String> {
        let list = self.notifs.lock().unwrap().clone();
        Ok(list.into_iter().filter(|n| n.cliente_id == cliente_id).collect())
    }
}

#[tokio::test]
async fn test_procesar_notificacion() {
    let cache_repo = Arc::new(MockCacheRepo {
        notifs: Mutex::new(Vec::new()),
    });
    let use_case = ProcesarNotificacion::new(cache_repo.clone());

    let res = use_case.ejecutar("client-123", "Descuento 10%").await;
    assert!(res.is_ok());
    let notif = res.unwrap();
    assert_eq!(notif.cliente_id, "client-123");
    assert!(notif.mensaje.contains("Descuento 10%"));

    let list = use_case.obtener_para_cliente("client-123").await.unwrap();
    assert_eq!(list.len(), 1);
    assert_eq!(list[0].id, notif.id);
}
