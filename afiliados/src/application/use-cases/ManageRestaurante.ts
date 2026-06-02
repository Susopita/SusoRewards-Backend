import { IRestauranteRepository } from '../../domain/repositories/IRestauranteRepository.js';
import { IEmpresaRepository } from '../../domain/repositories/IEmpresaRepository.js';
import { hashPassword } from '../../infrastructure/utils/crypto.js';

export class ManageRestaurante {
  constructor(
    private restauranteRepo: IRestauranteRepository,
    private empresaRepo: IEmpresaRepository
  ) {}

  async create(empresaId: string, data: { name: string; email: string; password?: string; code: string }) {
    const empresa = await this.empresaRepo.findById(empresaId);
    if (!empresa) throw new Error('Empresa no encontrada');

    const existingByEmail = await this.restauranteRepo.findByEmail(data.email);
    if (existingByEmail) {
      const isAssociated = existingByEmail.empresasId.map(id => id.toString()).includes(empresaId);
      if (isAssociated) {
        return existingByEmail;
      }
      const updatedEmpresas = [...existingByEmail.empresasId, empresaId];
      return await this.restauranteRepo.update(existingByEmail.id!, {
        empresasId: updatedEmpresas
      });
    }

    const existingByCode = await this.restauranteRepo.findByCode(data.code);
    if (existingByCode) {
      const isAssociated = existingByCode.empresasId.map(id => id.toString()).includes(empresaId);
      if (isAssociated) {
        return existingByCode;
      }
      const updatedEmpresas = [...existingByCode.empresasId, empresaId];
      return await this.restauranteRepo.update(existingByCode.id!, {
        empresasId: updatedEmpresas
      });
    }

    const plainPassword = data.password || data.email;
    const passwordHash = hashPassword(plainPassword);

    return await this.restauranteRepo.create({
      name: data.name,
      email: data.email,
      passwordHash,
      empresasId: [empresaId],
      code: data.code,
      active: true
    });
  }

  async delete(empresaId: string, id: string) {
    const restaurante = await this.restauranteRepo.findById(id);
    if (!restaurante) throw new Error('Restaurante no encontrado');
    const isAssociated = restaurante.empresasId.map(eid => eid.toString()).includes(empresaId);
    if (!isAssociated) {
      throw new Error('No autorizado para modificar este restaurante');
    }

    const updatedEmpresas = restaurante.empresasId.filter(eid => eid.toString() !== empresaId);
    if (updatedEmpresas.length === 0) {
      return await this.restauranteRepo.delete(id);
    } else {
      return await this.restauranteRepo.update(id, { empresasId: updatedEmpresas });
    }
  }

  async toggleStatus(empresaId: string, id: string, active?: boolean) {
    const restaurante = await this.restauranteRepo.findById(id);
    if (!restaurante) throw new Error('Restaurante no encontrado');
    const isAssociated = restaurante.empresasId.map(eid => eid.toString()).includes(empresaId);
    if (!isAssociated) {
      throw new Error('No autorizado para modificar este restaurante');
    }

    const newActive = active !== undefined ? active : !restaurante.active;
    return await this.restauranteRepo.update(id, { active: newActive });
  }

  async getByEmpresa(empresaId: string) {
    return await this.restauranteRepo.findByEmpresa(empresaId);
  }
}
