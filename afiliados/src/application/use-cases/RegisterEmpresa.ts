import { IEmpresaRepository } from '../../domain/repositories/IEmpresaRepository.js';
import { IRestauranteRepository } from '../../domain/repositories/IRestauranteRepository.js';
import { IClienteRepository } from '../../domain/repositories/IClienteRepository.js';
import { hashPassword } from '../../infrastructure/utils/crypto.js';

export class RegisterEmpresa {
  constructor(
    private empresaRepo: IEmpresaRepository,
    private restauranteRepo: IRestauranteRepository,
    private clienteRepo: IClienteRepository
  ) {}

  async execute(data: { name: string; email: string; password: string }) {
    const existingEmpresa = await this.empresaRepo.findByEmail(data.email);
    if (existingEmpresa) throw new Error('El correo ya está registrado');

    const existingRestaurante = await this.restauranteRepo.findByEmail(data.email);
    if (existingRestaurante) throw new Error('El correo ya está registrado');

    const existingCliente = await this.clienteRepo.findByEmail(data.email);
    if (existingCliente) throw new Error('El correo ya está registrado');

    const passwordHash = hashPassword(data.password);

    return await this.empresaRepo.create({
      name: data.name,
      email: data.email,
      passwordHash,
      active: true,
      programas: []
    });
  }
}
