import { buildServer } from './infrastructure/web/server.js';
import { connectDatabase } from './infrastructure/database/mongoose.js';
import { config } from './infrastructure/config/env.js';

const server = buildServer();

async function start() {
  try {
    if (config.NODE_ENV !== 'test') {
      await connectDatabase();
    }
    
    await server.listen({ port: config.PORT, host: '0.0.0.0' });
    console.log(`Servidor de afiliados escuchando en el puerto ${config.PORT}`);
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

start();
