import { FastifyInstance } from 'fastify';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware.js';
import { registerVentaUseCase } from '../../config/dependencies.js';

export async function ventaRoutes(fastify: FastifyInstance) {
  fastify.post('/ventas', {
    preHandler: [authenticate, authorizeRoles(['restaurante'])]
  }, async (request, reply) => {
    const { monto, tarjeta_cliente } = request.body as any;
    if (monto === undefined || !tarjeta_cliente) {
      return reply.status(400).send({ error: 'Campos monto y tarjeta_cliente son requeridos' });
    }
    try {
      const restaurantCode = request.session!.code;
      if (!restaurantCode) {
        return reply.status(400).send({ error: 'Falta código de restaurante en la sesión' });
      }
      const res = await registerVentaUseCase.execute(restaurantCode, { monto, tarjeta_cliente });
      return reply.status(201).send(res);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });
}
