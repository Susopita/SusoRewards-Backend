import { Cliente } from '../entities/Cliente.js';

export interface IClienteRepository {
  create(cliente: Omit<Cliente, 'id'>): Promise<Cliente>;
  findById(id: string): Promise<Cliente | null>;
  findByEmail(email: string): Promise<Cliente | null>;
  findByTarjeta(tarjetaCliente: string): Promise<Cliente | null>;
  findByEmpresa(empresaId: string): Promise<Cliente[]>;
  update(id: string, cliente: Partial<Cliente>): Promise<Cliente | null>;
}
