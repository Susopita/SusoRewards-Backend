import { IEmpresaRepository } from '../../domain/repositories/IEmpresaRepository.js';
import { Programa } from '../../domain/entities/Empresa.js';
import crypto from 'node:crypto';

export class ManagePrograma {
  constructor(private empresaRepo: IEmpresaRepository) {}

  async create(empresaId: string, data: { name: string; pointsRule: number; active: boolean; beneficios?: string; requisitos?: string; restaurantes?: string[] }) {
    const empresa = await this.empresaRepo.findById(empresaId);
    if (!empresa) throw new Error('Empresa no encontrada');

    const nuevoPrograma: Programa = {
      id: crypto.randomUUID(),
      name: data.name,
      pointsRule: data.pointsRule,
      active: data.active,
      beneficios: data.beneficios,
      requisitos: data.requisitos,
      restaurantes: data.restaurantes || []
    };

    const programas = [...empresa.programas, nuevoPrograma];
    await this.empresaRepo.update(empresaId, { programas });
    return nuevoPrograma;
  }

  async update(empresaId: string, programId: string, data: Partial<Omit<Programa, 'id'>>) {
    const empresa = await this.empresaRepo.findById(empresaId);
    if (!empresa) throw new Error('Empresa no encontrada');

    const programas = empresa.programas.map(prog => {
      if (prog.id === programId) {
        return { ...prog, ...data };
      }
      return prog;
    });

    await this.empresaRepo.update(empresaId, { programas });
    return programas.find(prog => prog.id === programId) || null;
  }

  async delete(empresaId: string, programId: string) {
    const empresa = await this.empresaRepo.findById(empresaId);
    if (!empresa) throw new Error('Empresa no encontrada');

    const programas = empresa.programas.filter(prog => prog.id !== programId);
    await this.empresaRepo.update(empresaId, { programas });
    return true;
  }

  async get(empresaId: string) {
    const empresa = await this.empresaRepo.findById(empresaId);
    if (!empresa) throw new Error('Empresa no encontrada');
    return empresa.programas;
  }
}
