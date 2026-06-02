import { IRestauranteRepository } from '../../../domain/repositories/IRestauranteRepository.js';
import { Restaurante } from '../../../domain/entities/Restaurante.js';
import { RestauranteModel } from '../schemas/RestauranteSchema.js';
import { queryCockroach } from '../cockroach.js';

export class MongooseRestauranteRepository implements IRestauranteRepository {
  async create(restaurante: Omit<Restaurante, 'id'>): Promise<Restaurante> {
    const doc = await RestauranteModel.create(restaurante);
    const res = doc.toJSON() as Restaurante;
    await queryCockroach(
      'INSERT INTO restaurantes (id, code, active) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET active = $3, code = $2',
      [res.id, res.code, res.active]
    );
    if (res.empresasId && res.empresasId.length > 0) {
      for (const empresaId of res.empresasId) {
        await queryCockroach(
          'INSERT INTO afiliaciones_restaurantes (restaurante_id, empresa_id) VALUES ($1, $2) ON CONFLICT (restaurante_id, empresa_id) DO NOTHING',
          [res.id, empresaId]
        );
      }
    }
    return res;
  }

  async findById(id: string): Promise<Restaurante | null> {
    const doc = await RestauranteModel.findById(id);
    if (!doc) return null;
    return doc.toJSON() as Restaurante;
  }

  async findByEmail(email: string): Promise<Restaurante | null> {
    const doc = await RestauranteModel.findOne({ email });
    if (!doc) return null;
    return doc.toJSON() as Restaurante;
  }

  async findByCode(code: string): Promise<Restaurante | null> {
    const doc = await RestauranteModel.findOne({ code });
    if (!doc) return null;
    return doc.toJSON() as Restaurante;
  }

  async findByEmpresa(empresaId: string): Promise<Restaurante[]> {
    const docs = await RestauranteModel.find({ empresasId: empresaId });
    return docs.map(doc => doc.toJSON() as Restaurante);
  }

  async update(id: string, restaurante: Partial<Restaurante>): Promise<Restaurante | null> {
    const doc = await RestauranteModel.findByIdAndUpdate(id, restaurante, { new: true });
    if (!doc) return null;
    const res = doc.toJSON() as Restaurante;
    await queryCockroach(
      'INSERT INTO restaurantes (id, code, active) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET active = $3, code = $2',
      [res.id, res.code, res.active]
    );
    if (res.empresasId) {
      if (res.empresasId.length > 0) {
        for (const empresaId of res.empresasId) {
          await queryCockroach(
            'INSERT INTO afiliaciones_restaurantes (restaurante_id, empresa_id) VALUES ($1, $2) ON CONFLICT (restaurante_id, empresa_id) DO NOTHING',
            [res.id, empresaId]
          );
        }
        await queryCockroach(
          'DELETE FROM afiliaciones_restaurantes WHERE restaurante_id = $1 AND NOT (empresa_id = ANY($2))',
          [res.id, res.empresasId]
        );
      } else {
        await queryCockroach(
          'DELETE FROM afiliaciones_restaurantes WHERE restaurante_id = $1',
          [res.id]
        );
      }
    }
    return res;
  }

  async delete(id: string): Promise<boolean> {
    const res = await RestauranteModel.findByIdAndDelete(id);
    if (res) {
      await queryCockroach('DELETE FROM afiliaciones_restaurantes WHERE restaurante_id = $1', [id]);
      await queryCockroach('DELETE FROM restaurantes WHERE id = $1', [id]);
    }
    return res !== null;
  }
}
