import { Empresa } from '../entities/Empresa.js';

export interface IEmpresaRepository {
  create(empresa: Omit<Empresa, 'id'>): Promise<Empresa>;
  findById(id: string): Promise<Empresa | null>;
  findByEmail(email: string): Promise<Empresa | null>;
  update(id: string, empresa: Partial<Empresa>): Promise<Empresa | null>;
}
