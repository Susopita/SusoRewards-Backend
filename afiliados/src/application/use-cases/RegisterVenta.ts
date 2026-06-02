import { IClienteRepository } from '../../domain/repositories/IClienteRepository.js';
import { IEventPublisher } from '../../domain/events/IEventPublisher.js';

export class RegisterVenta {
  constructor(
    private clienteRepo: IClienteRepository,
    private eventPublisher: IEventPublisher
  ) {}

  async execute(restaurantCode: string, data: { monto: number; tarjeta_cliente: string }) {
    const cliente = await this.clienteRepo.findByTarjeta(data.tarjeta_cliente);
    if (!cliente) {
      throw new Error('Cliente no registrado en el sistema');
    }
    if (!cliente.active) {
      throw new Error('El cliente está deshabilitado');
    }

    const eventPayload = {
      monto: data.monto,
      tarjeta_cliente: data.tarjeta_cliente,
      codigo_restaurante: restaurantCode,
      fecha_hora: new Date().toISOString()
    };

    await this.eventPublisher.publishCenaRegistrada(eventPayload);

    return {
      success: true,
      message: 'Venta registrada y evento publicado exitosamente',
      data: eventPayload
    };
  }
}
