import { IEmpresaRepository } from '../src/domain/repositories/IEmpresaRepository.js';
import { IRestauranteRepository } from '../src/domain/repositories/IRestauranteRepository.js';
import { IClienteRepository } from '../src/domain/repositories/IClienteRepository.js';
import { IEventPublisher } from '../src/domain/events/IEventPublisher.js';
import { Empresa } from '../src/domain/entities/Empresa.js';
import { Restaurante } from '../src/domain/entities/Restaurante.js';
import { Cliente } from '../src/domain/entities/Cliente.js';

export class InMemoryEmpresaRepository implements IEmpresaRepository {
  public empresas: Empresa[] = [];

  async create(empresa: Omit<Empresa, 'id'>): Promise<Empresa> {
    const newEmp: Empresa = {
      ...empresa,
      id: Math.random().toString(36).substring(2, 9)
    };
    this.empresas.push(newEmp);
    return newEmp;
  }

  async findById(id: string): Promise<Empresa | null> {
    return this.empresas.find(e => e.id === id) || null;
  }

  async findByEmail(email: string): Promise<Empresa | null> {
    return this.empresas.find(e => e.email === email) || null;
  }

  async update(id: string, empresa: Partial<Empresa>): Promise<Empresa | null> {
    const idx = this.empresas.findIndex(e => e.id === id);
    if (idx === -1) return null;
    this.empresas[idx] = { ...this.empresas[idx], ...empresa };
    return this.empresas[idx];
  }
}

export class InMemoryRestauranteRepository implements IRestauranteRepository {
  public restaurantes: Restaurante[] = [];

  async create(restaurante: Omit<Restaurante, 'id'>): Promise<Restaurante> {
    const newRes: Restaurante = {
      ...restaurante,
      id: Math.random().toString(36).substring(2, 9)
    };
    this.restaurantes.push(newRes);
    return newRes;
  }

  async findById(id: string): Promise<Restaurante | null> {
    return this.restaurantes.find(r => r.id === id) || null;
  }

  async findByEmail(email: string): Promise<Restaurante | null> {
    return this.restaurantes.find(r => r.email === email) || null;
  }

  async findByCode(code: string): Promise<Restaurante | null> {
    return this.restaurantes.find(r => r.code === code) || null;
  }

  async findByEmpresa(empresaId: string): Promise<Restaurante[]> {
    return this.restaurantes.filter(r => r.empresasId && r.empresasId.includes(empresaId));
  }

  async update(id: string, restaurante: Partial<Restaurante>): Promise<Restaurante | null> {
    const idx = this.restaurantes.findIndex(r => r.id === id);
    if (idx === -1) return null;
    this.restaurantes[idx] = { ...this.restaurantes[idx], ...restaurante };
    return this.restaurantes[idx];
  }

  async delete(id: string): Promise<boolean> {
    const lengthBefore = this.restaurantes.length;
    this.restaurantes = this.restaurantes.filter(r => r.id !== id);
    return this.restaurantes.length < lengthBefore;
  }
}

export class InMemoryClienteRepository implements IClienteRepository {
  public clientes: Cliente[] = [];

  async create(cliente: Omit<Cliente, 'id'>): Promise<Cliente> {
    const newCli: Cliente = {
      ...cliente,
      id: Math.random().toString(36).substring(2, 9)
    };
    this.clientes.push(newCli);
    return newCli;
  }

  async findById(id: string): Promise<Cliente | null> {
    return this.clientes.find(c => c.id === id) || null;
  }

  async findByEmail(email: string): Promise<Cliente | null> {
    return this.clientes.find(c => c.email === email) || null;
  }

  async findByTarjeta(tarjetaCliente: string): Promise<Cliente | null> {
    return this.clientes.find(c => c.tarjetaCliente === tarjetaCliente) || null;
  }

  async findByEmpresa(empresaId: string): Promise<Cliente[]> {
    return this.clientes.filter(c => c.empresasAfiliadas.map(id => id.toString()).includes(empresaId));
  }

  async update(id: string, cliente: Partial<Cliente>): Promise<Cliente | null> {
    const idx = this.clientes.findIndex(c => c.id === id);
    if (idx === -1) return null;
    this.clientes[idx] = { ...this.clientes[idx], ...cliente };
    return this.clientes[idx];
  }
}

export class MockEventPublisher implements IEventPublisher {
  public publishedEvents: any[] = [];

  async publishCenaRegistrada(event: any): Promise<void> {
    this.publishedEvents.push(event);
  }
}
