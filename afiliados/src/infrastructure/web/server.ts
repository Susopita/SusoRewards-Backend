import fastify from 'fastify';
import { authRoutes } from './routes/authRoutes.js';
import { empresaRoutes } from './routes/empresaRoutes.js';
import { ventaRoutes } from './routes/ventaRoutes.js';

export function buildServer() {
  const server = fastify({
    logger: {
      transport: {
        target: 'pino-pretty', // Hace que los logs en la terminal sean legibles y con colores
        options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' }
      }
    }
  });

  server.get('/health', async () => {
    return { status: 'OK', service: 'afiliados' };
  });

  server.register(authRoutes);
  server.register(empresaRoutes);
  server.register(ventaRoutes);

  return server;
}
