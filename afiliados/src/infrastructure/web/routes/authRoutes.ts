import { FastifyInstance } from 'fastify';
import { registerEmpresaUseCase, universalLoginUseCase, changePasswordUseCase, clienteRepo } from '../../config/dependencies.js';
import { authenticate } from '../middleware/authMiddleware.js';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/empresas/registrar', async (request, reply) => {
    const { name, email, password } = request.body as any;
    if (!name || !email || !password) {
      return reply.status(400).send({ error: 'Faltan campos obligatorios' });
    }
    try {
      const empresa = await registerEmpresaUseCase.execute({ name, email, password });
      return reply.status(201).send(empresa);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  fastify.post('/auth/login', async (request, reply) => {
    const { email, password } = request.body as any;
    if (!email || !password) {
      return reply.status(400).send({ error: 'Email y contraseña son requeridos' });
    }
    try {
      const result = await universalLoginUseCase.execute({ email, password });
      return reply.send(result);
    } catch (error: any) {
      return reply.status(401).send({ error: error.message });
    }
  });

  fastify.post('/auth/cambio-password', async (request, reply) => {
    const { email, currentPassword, newPassword } = request.body as any;
    if (!email || !newPassword) {
      return reply.status(400).send({ error: 'Email y nueva contraseña son requeridos' });
    }
    try {
      const result = await changePasswordUseCase.execute({ email, currentPassword, newPassword });
      return reply.send(result);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  fastify.get('/clientes/me', {
    preHandler: [authenticate]
  }, async (request, reply) => {
    try {
      const clientId = request.session!.id;
      const cliente = await clienteRepo.findById(clientId);
      if (!cliente) {
        return reply.status(404).send({ error: 'Cliente no encontrado' });
      }
      return reply.send(cliente);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });
}
