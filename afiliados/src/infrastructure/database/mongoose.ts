import mongoose from 'mongoose';
import { config } from '../config/env.js';

export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log('MongoDB conectado exitosamente');
  } catch (error) {
    console.error('Error al conectar a MongoDB:', error);
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
