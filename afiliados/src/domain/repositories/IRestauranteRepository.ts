import { Restaurante } from '../entities/Restaurante.js';

export interface IRestauranteRepository {
  create(restaurante: Omit<Restaurante, 'id'>): Promise<Restaurante>;
  findById(id: string): Promise<Restaurante | null>;
  findByEmail(email: string): Promise<Restaurante | null>;
  findByCode(code: string): Promise<Restaurante | null>;
  findByEmpresa(empresaId: string): Promise<Restaurante[]>;
  update(id: string, restaurante: Partial<Restaurante>): Promise<Restaurante | null>;
  delete(id: string): Promise<boolean>;
}
