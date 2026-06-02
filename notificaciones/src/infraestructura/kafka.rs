use crate::dominio::repositorios::CacheRepository;
use crate::aplicacion::casos_de_uso::ProcesarNotificacion;
use rdkafka::config::ClientConfig;
use rdkafka::consumer::{StreamConsumer, Consumer};
use rdkafka::Message;
use tokio::sync::broadcast;
use std::sync::Arc;
use serde_json::Value;

pub async fn start_kafka_consumer(
    brokers: &str,
    cache_repo: Arc<dyn CacheRepository>,
    tx: broadcast::Sender<String>,
) {
    let consumer: Option<StreamConsumer> = ClientConfig::new()
        .set("group.id", "notificaciones-group")
        .set("bootstrap.servers", brokers)
        .set("enable.partition.eof", "false")
        .set("session.timeout.ms", "6000")
        .set("enable.auto.commit", "true")
        .set("broker.address.family", "v4")
        .create()
        .ok();

    let consumer = match consumer {
        Some(c) => c,
        None => {
            println!("No se pudo crear el consumidor de Kafka para notificaciones. Omitiendo loop.");
            return;
        }
    };

    if consumer.subscribe(&["beneficio-otorgado"]).is_err() {
        println!("Error al suscribirse al tópico beneficio-otorgado");
        return;
    }

    println!("Consumidor Kafka de Notificaciones escuchando beneficio-otorgado...");
    let caso_uso = ProcesarNotificacion::new(cache_repo);

    tokio::spawn(async move {
        loop {
            match consumer.recv().await {
                Err(e) => {
                    println!("Error en el consumidor de Kafka de notificaciones: {}", e);
                }
                Ok(msg) => {
                    if let Some(payload) = msg.payload_view::<str>() {
                        match payload {
                            Ok(text) => {
                                println!("Evento recibido en beneficio-otorgado: {}", text);
                                if let Ok(val) = serde_json::from_str::<Value>(text) {
                                    let cliente_id = val["cliente_id"].as_str().unwrap_or("");
                                    let premio = val["premio"].as_str().unwrap_or("");

                                    if !cliente_id.is_empty() {
                                        match caso_uso.ejecutar(cliente_id, premio).await {
                                            Ok(notif) => {
                                                println!("Notificación registrada en cache: {:?}", notif);
                                                let sse_msg = serde_json::to_string(&notif).unwrap_or_default();
                                                if !sse_msg.is_empty() {
                                                    let _ = tx.send(sse_msg);
                                                }
                                            }
                                            Err(err) => println!("Error al guardar notificación: {}", err),
                                        }
                                    }
                                }
                            }
                            Err(e) => println!("Error al decodificar payload UTF-8 de notificación: {}", e),
                        }
                    }
                }
            }
        }
    });
}
