import dotenv from 'dotenv';
dotenv.config();

export const config = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/susorewards-afiliados',
  KAFKA_BROKERS: (process.env.KAFKA_BROKERS || 'localhost:29092').split(','),
  NODE_ENV: process.env.NODE_ENV || 'development'
};
