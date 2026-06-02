import { IEmpresaRepository } from '../../domain/repositories/IEmpresaRepository.js';
import { IRestauranteRepository } from '../../domain/repositories/IRestauranteRepository.js';
import { IClienteRepository } from '../../domain/repositories/IClienteRepository.js';
import { comparePassword } from '../../infrastructure/utils/crypto.js';
import { generateToken } from '../../infrastructure/utils/session.js';

export class UniversalLogin {
  constructor(
    private empresaRepo: IEmpresaRepository,
    private restauranteRepo: IRestauranteRepository,
    private clienteRepo: IClienteRepository
  ) {}

  async execute(data: { email: string; password: string }) {
    const empresa = await this.empresaRepo.findByEmail(data.email);
    if (empresa) {
      if (!empresa.active) {
        throw new Error('La cuenta está deshabilitada');
      }
      if (!comparePassword(data.password, empresa.passwordHash)) {
        throw new Error('Credenciales inválidas');
      }
      const token = generateToken({
        id: empresa.id!,
        email: empresa.email,
        role: 'empresa'
      });
      return {
        token,
        role: 'empresa',
        user: { id: empresa.id, name: empresa.name, email: empresa.email }
      };
    }

    const restaurante = await this.restauranteRepo.findByEmail(data.email);
    if (restaurante) {
      if (!restaurante.active) {
        throw new Error('La cuenta está deshabilitada');
      }
      if (!comparePassword(data.password, restaurante.passwordHash)) {
        throw new Error('Credenciales inválidas');
      }
      const token = generateToken({
        id: restaurante.id!,
        email: restaurante.email,
        role: 'restaurante',
        code: restaurante.code,
        empresasId: restaurante.empresasId
      });
      return {
        token,
        role: 'restaurante',
        user: {
          id: restaurante.id,
          name: restaurante.name,
          email: restaurante.email,
          code: restaurante.code,
          empresasId: restaurante.empresasId
        }
      };
    }

    const cliente = await this.clienteRepo.findByEmail(data.email);
    if (cliente) {
      if (!cliente.active) {
        throw new Error('La cuenta está deshabilitada');
      }
      if (!comparePassword(data.password, cliente.passwordHash)) {
        throw new Error('Credenciales inválidas');
      }
      const token = generateToken({
        id: cliente.id!,
        email: cliente.email,
        role: 'cliente'
      });
      return {
        token,
        role: 'cliente',
        user: {
          id: cliente.id,
          name: cliente.name,
          email: cliente.email,
          tarjetaCliente: cliente.tarjetaCliente
        }
      };
    }

    throw new Error('Credenciales inválidas');
  }
}
