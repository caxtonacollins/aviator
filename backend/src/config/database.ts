import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config();

const isCompiled = path.extname(__filename) === '.js';
const entitiesPath = isCompiled
  ? path.join(__dirname, '..', 'entities', '*{.js,.cjs}')
  : path.join(__dirname, '..', 'entities', '*{.ts,.js}');

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'aviator_dev',
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
  entities: [entitiesPath],
  migrations: [path.join(__dirname, '..', 'migrations', '*{.ts,.js}')],
  subscribers: [path.join(__dirname, '..', 'subscribers', '**', '*{.ts,.js}')],
});
