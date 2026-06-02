export interface IEventPublisher {
  publishCenaRegistrada(event: {
    monto: number;
    tarjeta_cliente: string;
    codigo_restaurante: string;
    fecha_hora: string;
  }): Promise<void>;
}
