import { describe, it, expect, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/infrastructure/database/mongoose.js';
import { MongooseClienteRepository } from '../src/infrastructure/database/repositories/MongooseClienteRepository.js';
import { MongooseEmpresaRepository } from '../src/infrastructure/database/repositories/MongooseEmpresaRepository.js';
import { MongooseRestauranteRepository } from '../src/infrastructure/database/repositories/MongooseRestauranteRepository.js';
import { ClienteModel } from '../src/infrastructure/database/schemas/ClienteSchema.js';
import { EmpresaModel } from '../src/infrastructure/database/schemas/EmpresaSchema.js';
import { RestauranteModel } from '../src/infrastructure/database/schemas/RestauranteSchema.js';
import { KafkaEventPublisher } from '../src/infrastructure/messaging/KafkaEventPublisher.js';

// Mock kafkajs
const mockProducer = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  send: vi.fn()
};
vi.mock('kafkajs', () => {
  return {
    Kafka: vi.fn().mockImplementation(() => {
      return {
        producer: () => mockProducer
      };
    })
  };
});

// Mock queryCockroach to prevent database connection errors during unit tests
vi.mock('../src/infrastructure/database/cockroach.js', () => {
  return {
    queryCockroach: vi.fn().mockResolvedValue({ rows: [] }),
    getCockroachPool: vi.fn().mockReturnValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      on: vi.fn()
    })
  };
});


describe('Infrastructure Unit Tests', () => {

  describe('mongoose.ts connection helper', () => {
    it('should connect to mongodb successfully', async () => {
      const connectSpy = vi.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await connectDatabase();
      
      expect(connectSpy).toHaveBeenCalled();
      connectSpy.mockRestore();
      consoleLogSpy.mockRestore();
    });

    it('should handle connection error and call process.exit', async () => {
      const connectSpy = vi.spyOn(mongoose, 'connect').mockRejectedValue(new Error('connection failed'));
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => { return undefined as never; });
      
      await connectDatabase();
      
      expect(connectSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
      
      connectSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      exitSpy.mockRestore();
    });

    it('should disconnect from mongodb', async () => {
      const disconnectSpy = vi.spyOn(mongoose, 'disconnect').mockResolvedValue();
      await disconnectDatabase();
      expect(disconnectSpy).toHaveBeenCalled();
      disconnectSpy.mockRestore();
    });
  });

  describe('MongooseClienteRepository', () => {
    const repo = new MongooseClienteRepository();

    it('should create a client', async () => {
      const mockDoc = { toJSON: () => ({ id: '123', name: 'John' }) };
      const spy = vi.spyOn(ClienteModel, 'create').mockResolvedValue(mockDoc as any);
      
      const res = await repo.create({ name: 'John', email: 'john@mail.com', passwordHash: 'hash', tarjetaCliente: 'CARD123', empresasAfiliadas: [] });
      expect(spy).toHaveBeenCalled();
      expect(res).toEqual({ id: '123', name: 'John' });
      spy.mockRestore();
    });

    it('should find by id', async () => {
      const mockDoc = { toJSON: () => ({ id: '123', name: 'John' }) };
      const spy = vi.spyOn(ClienteModel, 'findById').mockResolvedValue(mockDoc as any);
      
      const res = await repo.findById('123');
      expect(spy).toHaveBeenCalledWith('123');
      expect(res).toEqual({ id: '123', name: 'John' });
      spy.mockRestore();
    });

    it('should return null if findById is empty', async () => {
      const spy = vi.spyOn(ClienteModel, 'findById').mockResolvedValue(null);
      const res = await repo.findById('123');
      expect(res).toBeNull();
      spy.mockRestore();
    });

    it('should find by email', async () => {
      const mockDoc = { toJSON: () => ({ id: '123', email: 'john@mail.com' }) };
      const spy = vi.spyOn(ClienteModel, 'findOne').mockResolvedValue(mockDoc as any);
      
      const res = await repo.findByEmail('john@mail.com');
      expect(spy).toHaveBeenCalledWith({ email: 'john@mail.com' });
      expect(res).toEqual({ id: '123', email: 'john@mail.com' });
      spy.mockRestore();
    });

    it('should return null if findByEmail is empty', async () => {
      const spy = vi.spyOn(ClienteModel, 'findOne').mockResolvedValue(null);
      const res = await repo.findByEmail('john@mail.com');
      expect(res).toBeNull();
      spy.mockRestore();
    });

    it('should find by tarjeta', async () => {
      const mockDoc = { toJSON: () => ({ id: '123', tarjetaCliente: 'CARD123' }) };
      const spy = vi.spyOn(ClienteModel, 'findOne').mockResolvedValue(mockDoc as any);
      
      const res = await repo.findByTarjeta('CARD123');
      expect(spy).toHaveBeenCalledWith({ tarjetaCliente: 'CARD123' });
      expect(res).toEqual({ id: '123', tarjetaCliente: 'CARD123' });
      spy.mockRestore();
    });

    it('should return null if findByTarjeta is empty', async () => {
      const spy = vi.spyOn(ClienteModel, 'findOne').mockResolvedValue(null);
      const res = await repo.findByTarjeta('CARD123');
      expect(res).toBeNull();
      spy.mockRestore();
    });

    it('should find by empresa', async () => {
      const mockDocs = [{ toJSON: () => ({ id: '123' }) }];
      const spy = vi.spyOn(ClienteModel, 'find').mockResolvedValue(mockDocs as any);
      
      const res = await repo.findByEmpresa('emp123');
      expect(spy).toHaveBeenCalledWith({ empresasAfiliadas: 'emp123' });
      expect(res).toEqual([{ id: '123' }]);
      spy.mockRestore();
    });

    it('should update client', async () => {
      const mockDoc = { toJSON: () => ({ id: '123', name: 'John Updated' }) };
      const spy = vi.spyOn(ClienteModel, 'findByIdAndUpdate').mockResolvedValue(mockDoc as any);
      
      const res = await repo.update('123', { name: 'John Updated' });
      expect(spy).toHaveBeenCalledWith('123', { name: 'John Updated' }, { new: true });
      expect(res).toEqual({ id: '123', name: 'John Updated' });
      spy.mockRestore();
    });

    it('should return null if update client finds no doc', async () => {
      const spy = vi.spyOn(ClienteModel, 'findByIdAndUpdate').mockResolvedValue(null);
      const res = await repo.update('123', { name: 'John Updated' });
      expect(res).toBeNull();
      spy.mockRestore();
    });
  });

  describe('MongooseEmpresaRepository', () => {
    const repo = new MongooseEmpresaRepository();

    it('should create an empresa', async () => {
      const mockDoc = { toJSON: () => ({ id: '456', name: 'Company' }) };
      const spy = vi.spyOn(EmpresaModel, 'create').mockResolvedValue(mockDoc as any);
      
      const res = await repo.create({ name: 'Company', email: 'company@mail.com', passwordHash: 'hash', active: true, programas: [] });
      expect(spy).toHaveBeenCalled();
      expect(res).toEqual({ id: '456', name: 'Company' });
      spy.mockRestore();
    });

    it('should find by id', async () => {
      const mockDoc = { toJSON: () => ({ id: '456', name: 'Company' }) };
      const spy = vi.spyOn(EmpresaModel, 'findById').mockResolvedValue(mockDoc as any);
      
      const res = await repo.findById('456');
      expect(spy).toHaveBeenCalledWith('456');
      expect(res).toEqual({ id: '456', name: 'Company' });
      spy.mockRestore();
    });

    it('should return null if findById is empty', async () => {
      const spy = vi.spyOn(EmpresaModel, 'findById').mockResolvedValue(null);
      const res = await repo.findById('456');
      expect(res).toBeNull();
      spy.mockRestore();
    });

    it('should find by email', async () => {
      const mockDoc = { toJSON: () => ({ id: '456', email: 'company@mail.com' }) };
      const spy = vi.spyOn(EmpresaModel, 'findOne').mockResolvedValue(mockDoc as any);
      
      const res = await repo.findByEmail('company@mail.com');
      expect(spy).toHaveBeenCalledWith({ email: 'company@mail.com' });
      expect(res).toEqual({ id: '456', email: 'company@mail.com' });
      spy.mockRestore();
    });

    it('should return null if findByEmail is empty', async () => {
      const spy = vi.spyOn(EmpresaModel, 'findOne').mockResolvedValue(null);
      const res = await repo.findByEmail('company@mail.com');
      expect(res).toBeNull();
      spy.mockRestore();
    });

    it('should update empresa', async () => {
      const mockDoc = { toJSON: () => ({ id: '456', name: 'Company Updated' }) };
      const spy = vi.spyOn(EmpresaModel, 'findByIdAndUpdate').mockResolvedValue(mockDoc as any);
      
      const res = await repo.update('456', { name: 'Company Updated' });
      expect(spy).toHaveBeenCalledWith('456', { name: 'Company Updated' }, { new: true });
      expect(res).toEqual({ id: '456', name: 'Company Updated' });
      spy.mockRestore();
    });

    it('should return null if update empresa finds no doc', async () => {
      const spy = vi.spyOn(EmpresaModel, 'findByIdAndUpdate').mockResolvedValue(null);
      const res = await repo.update('456', { name: 'Company Updated' });
      expect(res).toBeNull();
      spy.mockRestore();
    });
  });

  describe('MongooseRestauranteRepository', () => {
    const repo = new MongooseRestauranteRepository();

    it('should create a restaurante', async () => {
      const mockDoc = { toJSON: () => ({ id: '789', name: 'Rest' }) };
      const spy = vi.spyOn(RestauranteModel, 'create').mockResolvedValue(mockDoc as any);
      
      const res = await repo.create({ name: 'Rest', email: 'rest@mail.com', passwordHash: 'hash', code: 'CODE1', active: true, empresasId: ['emp1'] });
      expect(spy).toHaveBeenCalled();
      expect(res).toEqual({ id: '789', name: 'Rest' });
      spy.mockRestore();
    });

    it('should find by id', async () => {
      const mockDoc = { toJSON: () => ({ id: '789', name: 'Rest' }) };
      const spy = vi.spyOn(RestauranteModel, 'findById').mockResolvedValue(mockDoc as any);
      
      const res = await repo.findById('789');
      expect(spy).toHaveBeenCalledWith('789');
      expect(res).toEqual({ id: '789', name: 'Rest' });
      spy.mockRestore();
    });

    it('should return null if findById is empty', async () => {
      const spy = vi.spyOn(RestauranteModel, 'findById').mockResolvedValue(null);
      const res = await repo.findById('789');
      expect(res).toBeNull();
      spy.mockRestore();
    });

    it('should find by email', async () => {
      const mockDoc = { toJSON: () => ({ id: '789', email: 'rest@mail.com' }) };
      const spy = vi.spyOn(RestauranteModel, 'findOne').mockResolvedValue(mockDoc as any);
      
      const res = await repo.findByEmail('rest@mail.com');
      expect(spy).toHaveBeenCalledWith({ email: 'rest@mail.com' });
      expect(res).toEqual({ id: '789', email: 'rest@mail.com' });
      spy.mockRestore();
    });

    it('should return null if findByEmail is empty', async () => {
      const spy = vi.spyOn(RestauranteModel, 'findOne').mockResolvedValue(null);
      const res = await repo.findByEmail('rest@mail.com');
      expect(res).toBeNull();
      spy.mockRestore();
    });

    it('should find by code', async () => {
      const mockDoc = { toJSON: () => ({ id: '789', code: 'CODE1' }) };
      const spy = vi.spyOn(RestauranteModel, 'findOne').mockResolvedValue(mockDoc as any);
      
      const res = await repo.findByCode('CODE1');
      expect(spy).toHaveBeenCalledWith({ code: 'CODE1' });
      expect(res).toEqual({ id: '789', code: 'CODE1' });
      spy.mockRestore();
    });

    it('should return null if findByCode is empty', async () => {
      const spy = vi.spyOn(RestauranteModel, 'findOne').mockResolvedValue(null);
      const res = await repo.findByCode('CODE1');
      expect(res).toBeNull();
      spy.mockRestore();
    });

    it('should find by empresa', async () => {
      const mockDocs = [{ toJSON: () => ({ id: '789' }) }];
      const spy = vi.spyOn(RestauranteModel, 'find').mockResolvedValue(mockDocs as any);
      
      const res = await repo.findByEmpresa('emp1');
      expect(spy).toHaveBeenCalledWith({ empresasId: 'emp1' });
      expect(res).toEqual([{ id: '789' }]);
      spy.mockRestore();
    });

    it('should update restaurante', async () => {
      const mockDoc = { toJSON: () => ({ id: '789', name: 'Rest Updated' }) };
      const spy = vi.spyOn(RestauranteModel, 'findByIdAndUpdate').mockResolvedValue(mockDoc as any);
      
      const res = await repo.update('789', { name: 'Rest Updated' });
      expect(spy).toHaveBeenCalledWith('789', { name: 'Rest Updated' }, { new: true });
      expect(res).toEqual({ id: '789', name: 'Rest Updated' });
      spy.mockRestore();
    });

    it('should return null if update restaurante finds no doc', async () => {
      const spy = vi.spyOn(RestauranteModel, 'findByIdAndUpdate').mockResolvedValue(null);
      const res = await repo.update('789', { name: 'Rest Updated' });
      expect(res).toBeNull();
      spy.mockRestore();
    });

    it('should delete a restaurante', async () => {
      const spy = vi.spyOn(RestauranteModel, 'findByIdAndDelete').mockResolvedValue({ id: '789' } as any);
      const res = await repo.delete('789');
      expect(spy).toHaveBeenCalledWith('789');
      expect(res).toBe(true);
      spy.mockRestore();
    });

    it('should return false if deleting non-existent restaurante', async () => {
      const spy = vi.spyOn(RestauranteModel, 'findByIdAndDelete').mockResolvedValue(null);
      const res = await repo.delete('789');
      expect(res).toBe(false);
      spy.mockRestore();
    });
  });

  describe('KafkaEventPublisher', () => {
    beforeEach(() => {
      mockProducer.connect.mockReset();
      mockProducer.disconnect.mockReset();
      mockProducer.send.mockReset();
    });

    it('should connect and publish event', async () => {
      const publisher = new KafkaEventPublisher();
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await publisher.connect();
      expect(mockProducer.connect).toHaveBeenCalledTimes(1);

      const event = {
        monto: 100,
        tarjeta_cliente: 'CARD123',
        codigo_restaurante: 'REST1',
        fecha_hora: '2026-05-30T00:00:00.000Z'
      };
      await publisher.publishCenaRegistrada(event);

      expect(mockProducer.send).toHaveBeenCalledWith({
        topic: 'cena-registrada',
        messages: [
          {
            key: 'CARD123',
            value: JSON.stringify(event)
          }
        ]
      });

      await publisher.disconnect();
      expect(mockProducer.disconnect).toHaveBeenCalledTimes(1);

      consoleLogSpy.mockRestore();
    });

    it('should handle connect error and print error logs', async () => {
      const publisher = new KafkaEventPublisher();
      mockProducer.connect.mockRejectedValue(new Error('Kafkajs connection failed'));
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await publisher.connect();
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    it('should fallback/warn if not connected when publishing event', async () => {
      const publisher = new KafkaEventPublisher();
      mockProducer.connect.mockRejectedValue(new Error('Kafkajs connection failed'));
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await publisher.publishCenaRegistrada({
        monto: 100,
        tarjeta_cliente: 'CARD123',
        codigo_restaurante: 'REST1',
        fecha_hora: '2026-05-30T00:00:00.000Z'
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Kafka no está conectado'));
      expect(mockProducer.send).not.toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Mongoose Schemas toJSON Transforms', () => {
    it('should transform Cliente model correctly', () => {
      const objId = new mongoose.Types.ObjectId();
      const empId = new mongoose.Types.ObjectId();
      const doc = new ClienteModel({
        _id: objId,
        name: 'Cliente Test',
        email: 'cli@test.com',
        passwordHash: 'hash',
        tarjetaCliente: 'CARD-JSON',
        empresasAfiliadas: [empId],
        active: true
      });

      const json = doc.toJSON();
      expect(json.id).toBe(objId.toString());
      expect(json.empresasAfiliadas).toEqual([empId.toString()]);
      expect(json._id).toBeUndefined();
      expect(json.__v).toBeUndefined();
    });

    it('should transform Restaurante model correctly', () => {
      const objId = new mongoose.Types.ObjectId();
      const empId = new mongoose.Types.ObjectId();
      const doc = new RestauranteModel({
        _id: objId,
        name: 'Rest Test',
        email: 'rest@test.com',
        passwordHash: 'hash',
        empresasId: [empId],
        code: 'REST-JSON',
        active: true
      });

      const json = doc.toJSON();
      expect(json.id).toBe(objId.toString());
      expect(json.empresasId).toEqual([empId.toString()]);
      expect(json._id).toBeUndefined();
      expect(json.__v).toBeUndefined();
    });

    it('should transform Empresa model correctly', () => {
      const objId = new mongoose.Types.ObjectId();
      const doc = new EmpresaModel({
        _id: objId,
        name: 'Emp Test',
        email: 'emp@test.com',
        passwordHash: 'hash',
        active: true,
        programas: []
      });

      const json = doc.toJSON();
      expect(json.id).toBe(objId.toString());
      expect(json._id).toBeUndefined();
      expect(json.__v).toBeUndefined();
    });
  });

});
