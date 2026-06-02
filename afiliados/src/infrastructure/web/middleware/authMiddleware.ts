import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken, Session } from '../../utils/session.js';

declare module 'fastify' {
  interface FastifyRequest {
    session?: Session;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'No autorizado, token ausente' });
  }
  const token = authHeader.substring(7);
  const session = verifyToken(token);
  if (!session) {
    return reply.status(401).send({ error: 'Token inválido o expirado' });
  }
  request.session = session;
}

export function authorizeRoles(roles: Array<'empresa' | 'restaurante' | 'cliente'>) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.session || !roles.includes(request.session.role)) {
      return reply.status(403).send({ error: 'Permisos insuficientes' });
    }
  };
}
