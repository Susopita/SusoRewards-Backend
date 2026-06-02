import { Kafka, Producer } from 'kafkajs';
import { IEventPublisher } from '../../domain/events/IEventPublisher.js';
import { config } from '../config/env.js';

export class KafkaEventPublisher implements IEventPublisher {
  private kafka: Kafka;
  private producer: Producer;
  private isConnected = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'afiliados-service',
      brokers: config.KAFKA_BROKERS
    });
    this.producer = this.kafka.producer();
  }

  async connect() {
    if (!this.isConnected) {
      try {
        await this.producer.connect();
        this.isConnected = true;
        console.log('Productor de Kafka conectado exitosamente');
      } catch (err) {
        console.error('Error al conectar el productor de Kafka:', err);
      }
    }
  }

  async disconnect() {
    if (this.isConnected) {
      await this.producer.disconnect();
      this.isConnected = false;
    }
  }

  async publishCenaRegistrada(event: {
    monto: number;
    tarjeta_cliente: string;
    codigo_restaurante: string;
    fecha_hora: string;
  }): Promise<void> {
    try {
      await this.connect();
    } catch {
      // Ignorar fallo de conexión para continuar con logs en pruebas
    }
    
    if (!this.isConnected) {
      console.warn('Kafka no está conectado. Omitiendo publicación real de evento (Fallback/Testing mode).');
      return;
    }

    await this.producer.send({
      topic: 'cena-registrada',
      messages: [
        {
          key: event.tarjeta_cliente,
          value: JSON.stringify(event)
        }
      ]
    });
    console.log('Evento cena-registrada publicado a Kafka:', event);
  }
}
