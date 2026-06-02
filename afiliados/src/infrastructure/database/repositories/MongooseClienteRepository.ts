import { IClienteRepository } from '../../../domain/repositories/IClienteRepository.js';
import { Cliente } from '../../../domain/entities/Cliente.js';
import { ClienteModel } from '../schemas/ClienteSchema.js';
import { queryCockroach } from '../cockroach.js';

export class MongooseClienteRepository implements IClienteRepository {
  async create(cliente: Omit<Cliente, 'id'>): Promise<Cliente> {
    const doc = await ClienteModel.create(cliente);
    const res = doc.toJSON() as Cliente;

    await queryCockroach(
      'INSERT INTO clientes (id, tarjeta_cliente, active) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET tarjeta_cliente = $2, active = $3',
      [res.id, res.tarjetaCliente, res.active]
    );

    if (res.empresasAfiliadas && res.empresasAfiliadas.length > 0) {
      for (const empresaId of res.empresasAfiliadas) {
        await queryCockroach(
          'INSERT INTO afiliaciones_clientes (cliente_id, empresa_id) VALUES ($1, $2) ON CONFLICT (cliente_id, empresa_id) DO NOTHING',
          [res.id, empresaId]
        );
      }
    }

    return res;
  }

  async findById(id: string): Promise<Cliente | null> {
    const doc = await ClienteModel.findById(id);
    if (!doc) return null;
    return doc.toJSON() as Cliente;
  }

  async findByEmail(email: string): Promise<Cliente | null> {
    const doc = await ClienteModel.findOne({ email });
    if (!doc) return null;
    return doc.toJSON() as Cliente;
  }

  async findByTarjeta(tarjetaCliente: string): Promise<Cliente | null> {
    const doc = await ClienteModel.findOne({ tarjetaCliente });
    if (!doc) return null;
    return doc.toJSON() as Cliente;
  }

  async findByEmpresa(empresaId: string): Promise<Cliente[]> {
    const docs = await ClienteModel.find({ empresasAfiliadas: empresaId });
    return docs.map(doc => doc.toJSON() as Cliente);
  }

  async update(id: string, cliente: Partial<Cliente>): Promise<Cliente | null> {
    const doc = await ClienteModel.findByIdAndUpdate(id, cliente, { new: true });
    if (!doc) return null;
    const res = doc.toJSON() as Cliente;

    await queryCockroach(
      'INSERT INTO clientes (id, tarjeta_cliente, active) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET tarjeta_cliente = $2, active = $3',
      [res.id, res.tarjetaCliente, res.active]
    );

    if (res.empresasAfiliadas) {
      if (res.empresasAfiliadas.length > 0) {
        for (const empresaId of res.empresasAfiliadas) {
          await queryCockroach(
            'INSERT INTO afiliaciones_clientes (cliente_id, empresa_id) VALUES ($1, $2) ON CONFLICT (cliente_id, empresa_id) DO NOTHING',
            [res.id, empresaId]
          );
        }
        await queryCockroach(
          'DELETE FROM afiliaciones_clientes WHERE cliente_id = $1 AND NOT (empresa_id = ANY($2))',
          [res.id, res.empresasAfiliadas]
        );
      } else {
        await queryCockroach(
          'DELETE FROM afiliaciones_clientes WHERE cliente_id = $1',
          [res.id]
        );
      }
    }

    return res;
  }
}
