import { IEmpresaRepository } from '../../domain/repositories/IEmpresaRepository.js';
import { IRestauranteRepository } from '../../domain/repositories/IRestauranteRepository.js';
import { IClienteRepository } from '../../domain/repositories/IClienteRepository.js';
import { hashPassword, comparePassword } from '../../infrastructure/utils/crypto.js';

export class ChangePassword {
  constructor(
    private empresaRepo: IEmpresaRepository,
    private restauranteRepo: IRestauranteRepository,
    private clienteRepo: IClienteRepository
  ) {}

  async execute(data: { email: string; currentPassword?: string; newPassword: string }) {
    let user: any = null;
    let repo: any = null;

    const empresa = await this.empresaRepo.findByEmail(data.email);
    if (empresa) {
      user = empresa;
      repo = this.empresaRepo;
    } else {
      const restaurante = await this.restauranteRepo.findByEmail(data.email);
      if (restaurante) {
        user = restaurante;
        repo = this.restauranteRepo;
      } else {
        const cliente = await this.clienteRepo.findByEmail(data.email);
        if (cliente) {
          user = cliente;
          repo = this.clienteRepo;
        }
      }
    }

    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const emailHash = hashPassword(data.email);
    const isTemporary = user.passwordHash === emailHash;

    if (isTemporary) {
      const newHash = hashPassword(data.newPassword);
      await repo.update(user.id, { passwordHash: newHash });
      return { message: 'Contraseña cambiada exitosamente' };
    } else {
      if (!data.currentPassword) {
        throw new Error('Se requiere la contraseña actual');
      }
      if (!comparePassword(data.currentPassword, user.passwordHash)) {
        throw new Error('La contraseña actual es incorrecta');
      }
      const newHash = hashPassword(data.newPassword);
      await repo.update(user.id, { passwordHash: newHash });
      return { message: 'Contraseña cambiada exitosamente' };
    }
  }
}
