import { IEmpresaRepository } from '../../../domain/repositories/IEmpresaRepository.js';
import { Empresa } from '../../../domain/entities/Empresa.js';
import { EmpresaModel } from '../schemas/EmpresaSchema.js';
import { queryCockroach } from '../cockroach.js';

export class MongooseEmpresaRepository implements IEmpresaRepository {
  async create(empresa: Omit<Empresa, 'id'>): Promise<Empresa> {
    const doc = await EmpresaModel.create(empresa);
    const res = doc.toJSON() as Empresa;

    if (res.programas && res.programas.length > 0) {
      for (const prog of res.programas) {
        await queryCockroach(
          'INSERT INTO programas_recompensa (id, empresa_id, nombre, regla_puntos, activa) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET nombre = $3, regla_puntos = $4, activa = $5',
          [prog.id, res.id, prog.name, prog.pointsRule, prog.active]
        );
      }
    }

    return res;
  }

  async findById(id: string): Promise<Empresa | null> {
    const doc = await EmpresaModel.findById(id);
    if (!doc) return null;
    return doc.toJSON() as Empresa;
  }

  async findByEmail(email: string): Promise<Empresa | null> {
    const doc = await EmpresaModel.findOne({ email });
    if (!doc) return null;
    return doc.toJSON() as Empresa;
  }

  async update(id: string, empresa: Partial<Empresa>): Promise<Empresa | null> {
    const doc = await EmpresaModel.findByIdAndUpdate(id, empresa, { new: true });
    if (!doc) return null;
    const res = doc.toJSON() as Empresa;

    if (res.programas) {
      if (res.programas.length > 0) {
        for (const prog of res.programas) {
          await queryCockroach(
            'INSERT INTO programas_recompensa (id, empresa_id, nombre, regla_puntos, activa) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET nombre = $3, regla_puntos = $4, activa = $5',
            [prog.id, res.id, prog.name, prog.pointsRule, prog.active]
          );
        }
        const progIds = res.programas.map((p: any) => p.id);
        await queryCockroach(
          'DELETE FROM programas_recompensa WHERE empresa_id = $1 AND NOT (id = ANY($2))',
          [res.id, progIds]
        );
      } else {
        await queryCockroach(
          'DELETE FROM programas_recompensa WHERE empresa_id = $1',
          [res.id]
        );
      }
    }

    return res;
  }
}
