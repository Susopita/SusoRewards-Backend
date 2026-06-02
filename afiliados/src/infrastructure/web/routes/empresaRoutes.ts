import { FastifyInstance } from 'fastify';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware.js';
import {
  manageRestauranteUseCase,
  manageClienteUseCase,
  manageProgramaUseCase
} from '../../config/dependencies.js';

export async function empresaRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);
  fastify.addHook('preHandler', authorizeRoles(['empresa']));

  // --- RESTAURANTES ---
  fastify.post('/restaurantes', async (request, reply) => {
    const { name, email, password, code } = request.body as any;
    if (!name || !email || !code) {
      return reply.status(400).send({ error: 'Campos name, email y code son requeridos' });
    }
    try {
      const empresaId = request.session!.id;
      const res = await manageRestauranteUseCase.create(empresaId, { name, email, password, code });
      return reply.status(201).send(res);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  fastify.delete('/restaurantes/:id', async (request, reply) => {
    const { id } = request.params as any;
    try {
      const empresaId = request.session!.id;
      await manageRestauranteUseCase.delete(empresaId, id);
      return reply.send({ message: 'Restaurante desvinculado exitosamente' });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  fastify.patch('/restaurantes/:id/status', async (request, reply) => {
    const { id } = request.params as any;
    const { active } = (request.body as any) || {};
    try {
      const empresaId = request.session!.id;
      const res = await manageRestauranteUseCase.toggleStatus(empresaId, id, active);
      return reply.send(res);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  fastify.get('/restaurantes', async (request, reply) => {
    try {
      const empresaId = request.session!.id;
      const list = await manageRestauranteUseCase.getByEmpresa(empresaId);
      return reply.send(list);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // --- CLIENTES ---
  fastify.post('/clientes', async (request, reply) => {
    const { name, email, password, tarjetaCliente } = request.body as any;
    if (!name || !email || !tarjetaCliente) {
      return reply.status(400).send({ error: 'Campos name, email y tarjetaCliente son requeridos' });
    }
    try {
      const empresaId = request.session!.id;
      const res = await manageClienteUseCase.affiliateOrCreate(empresaId, { name, email, password, tarjetaCliente });
      return reply.status(201).send(res);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  fastify.delete('/clientes/:id', async (request, reply) => {
    const { id } = request.params as any;
    try {
      const empresaId = request.session!.id;
      await manageClienteUseCase.disaffiliate(empresaId, id);
      return reply.send({ message: 'Cliente desvinculado exitosamente' });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  fastify.patch('/clientes/:id/status', async (request, reply) => {
    const { id } = request.params as any;
    const { active } = (request.body as any) || {};
    try {
      const empresaId = request.session!.id;
      const res = await manageClienteUseCase.toggleStatus(empresaId, id, active);
      return reply.send(res);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  fastify.get('/clientes', async (request, reply) => {
    try {
      const empresaId = request.session!.id;
      const list = await manageClienteUseCase.getByEmpresa(empresaId);
      return reply.send(list);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  // --- PROGRAMAS ---
  fastify.post('/programas', async (request, reply) => {
    const { name, pointsRule, active, beneficios, requisitos, restaurantes } = request.body as any;
    if (!name || pointsRule === undefined) {
      return reply.status(400).send({ error: 'Campos name y pointsRule son requeridos' });
    }
    try {
      const empresaId = request.session!.id;
      const res = await manageProgramaUseCase.create(empresaId, { name, pointsRule, active: active ?? true, beneficios, requisitos, restaurantes });
      return reply.status(201).send(res);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  fastify.get('/programas', async (request, reply) => {
    try {
      const empresaId = request.session!.id;
      const list = await manageProgramaUseCase.get(empresaId);
      return reply.send(list);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  fastify.put('/programas/:id', async (request, reply) => {
    const { id } = request.params as any;
    const { name, pointsRule, active, beneficios, requisitos, restaurantes } = request.body as any;
    try {
      const empresaId = request.session!.id;
      const res = await manageProgramaUseCase.update(empresaId, id, { name, pointsRule, active, beneficios, requisitos, restaurantes });
      return reply.send(res);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  fastify.delete('/programas/:id', async (request, reply) => {
    const { id } = request.params as any;
    try {
      const empresaId = request.session!.id;
      await manageProgramaUseCase.delete(empresaId, id);
      return reply.send({ message: 'Programa eliminado exitosamente' });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });
}
