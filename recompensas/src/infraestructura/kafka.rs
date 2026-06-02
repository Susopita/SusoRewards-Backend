use crate::dominio::eventos::EventPublisher;
use crate::dominio::entidades::Beneficio;
use crate::dominio::repositorios::RecompensasRepository;
use crate::aplicacion::casos_de_uso::ProcesarConsumo;
use async_trait::async_trait;
use rdkafka::producer::{FutureProducer, FutureRecord};
use rdkafka::config::ClientConfig;
use rdkafka::consumer::{StreamConsumer, Consumer};
use rdkafka::Message;
use std::sync::Arc;
use serde_json::Value;

pub struct KafkaEventPublisher {
    producer: Option<FutureProducer>,
}

impl KafkaEventPublisher {
    pub fn new(brokers: &str) -> Self {
        let producer: Option<FutureProducer> = ClientConfig::new()
            .set("bootstrap.servers", brokers)
            .set("message.timeout.ms", "5000")
            .set("broker.address.family", "v4")
            .create()   
            .ok();

        if producer.is_none() {
            println!("Advertencia: No se pudo conectar a los brokers de Kafka {}. Corriendo en modo fallback.", brokers);
        }

        Self { producer }
    }
}

#[async_trait]
impl EventPublisher for KafkaEventPublisher {
    async fn publicar_beneficio_otorgado(&self, b: &Beneficio) -> Result<(), String> {
        let payload = serde_json::to_string(b).map_err(|e| e.to_string())?;

        if let Some(ref prod) = self.producer {
            let record = FutureRecord::to("beneficio-otorgado")
                .key(&b.cliente_id)
                .payload(&payload);
            
            prod.send(record, std::time::Duration::from_secs(5))
                .await
                .map_err(|(e, _)| e.to_string())?;
            println!("Evento beneficio-otorgado publicado exitosamente en Kafka.");
        } else {
            println!("Kafka offline - Mock publicado: {}", payload);
        }

        Ok(())
    }
}

pub async fn start_kafka_consumer(
    brokers: &str,
    repo: Arc<dyn RecompensasRepository>,
    publisher: Arc<dyn EventPublisher>,
) {
    let consumer: Option<StreamConsumer> = ClientConfig::new()
        .set("group.id", "recompensas-group")
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
            println!("No se pudo crear el consumidor de Kafka. Omitiendo bucle de consumo.");
            return;
        }
    };

    if consumer.subscribe(&["cena-registrada"]).is_err() {
        println!("Error al suscribirse al tópico cena-registrada");
        return;
    }

    println!("Consumidor Kafka de Recompensas escuchando cena-registrada...");
    let caso_uso = ProcesarConsumo::new(repo, publisher);

    tokio::spawn(async move {
        loop {
            match consumer.recv().await {
                Err(e) => {
                    println!("Error de Kafka: {}", e);
                }
                Ok(msg) => {
                    if let Some(payload) = msg.payload_view::<str>() {
                        match payload {
                            Ok(text) => {
                                println!("Evento recibido en cena-registrada: {}", text);
                                if let Ok(val) = serde_json::from_str::<Value>(text) {
                                    let monto = val["monto"].as_f64().unwrap_or(0.0);
                                    let tarjeta_cliente = val["tarjeta_cliente"].as_str().unwrap_or("");
                                    let codigo_restaurante = val["codigo_restaurante"].as_str().unwrap_or("");
                                    let fecha_hora = val["fecha_hora"].as_str().unwrap_or("");

                                    if !tarjeta_cliente.is_empty() && !codigo_restaurante.is_empty() {
                                        let res = caso_uso.ejecutar(monto, tarjeta_cliente, codigo_restaurante, fecha_hora).await;
                                        match res {
                                            Ok(ben) => println!("Beneficio procesado y otorgado: {:?}", ben),
                                            Err(err) => println!("Error al procesar beneficio: {}", err),
                                        }
                                    }
                                }
                            }
                            Err(e) => println!("Error al decodificar payload UTF-8: {}", e),
                        }
                    }
                }
            }
        }
    });
}
