import { IClienteRepository } from '../../domain/repositories/IClienteRepository.js';
import { IEmpresaRepository } from '../../domain/repositories/IEmpresaRepository.js';
import { hashPassword } from '../../infrastructure/utils/crypto.js';

export class ManageCliente {
  constructor(
    private clienteRepo: IClienteRepository,
    private empresaRepo: IEmpresaRepository
  ) {}

  async affiliateOrCreate(empresaId: string, data: { name: string; email: string; password?: string; tarjetaCliente: string }) {
    const empresa = await this.empresaRepo.findById(empresaId);
    if (!empresa) throw new Error('Empresa no encontrada');

    const existingByEmail = await this.clienteRepo.findByEmail(data.email);
    if (existingByEmail) {
      const isAffiliated = existingByEmail.empresasAfiliadas.map(id => id.toString()).includes(empresaId);
      if (isAffiliated) {
        return existingByEmail;
      }
      const updatedAffiliations = [...existingByEmail.empresasAfiliadas, empresaId];
      return await this.clienteRepo.update(existingByEmail.id!, {
        empresasAfiliadas: updatedAffiliations
      });
    }

    const existingByTarjeta = await this.clienteRepo.findByTarjeta(data.tarjetaCliente);
    if (existingByTarjeta) {
      throw new Error('El número de tarjeta de cliente ya está en uso');
    }

    const plainPassword = data.password || data.email;
    const passwordHash = hashPassword(plainPassword);

    return await this.clienteRepo.create({
      name: data.name,
      email: data.email,
      passwordHash,
      tarjetaCliente: data.tarjetaCliente,
      empresasAfiliadas: [empresaId],
      active: true
    });
  }

  async disaffiliate(empresaId: string, id: string) {
    const cliente = await this.clienteRepo.findById(id);
    if (!cliente) throw new Error('Cliente no encontrado');

    const updatedAffiliations = cliente.empresasAfiliadas.filter(eid => eid.toString() !== empresaId);
    return await this.clienteRepo.update(id, { empresasAfiliadas: updatedAffiliations });
  }

  async toggleStatus(empresaId: string, id: string, active?: boolean) {
    const cliente = await this.clienteRepo.findById(id);
    if (!cliente) throw new Error('Cliente no encontrado');

    const isAffiliated = cliente.empresasAfiliadas.map(eid => eid.toString()).includes(empresaId);
    if (!isAffiliated) {
      throw new Error('No autorizado para modificar este cliente');
    }

    const newActive = active !== undefined ? active : !cliente.active;
    return await this.clienteRepo.update(id, { active: newActive });
  }

  async getByEmpresa(empresaId: string) {
    return await this.clienteRepo.findByEmpresa(empresaId);
  }
}
