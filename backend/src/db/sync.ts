import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { logger } from '../utils/logger';

(async () => {
  try {
    await AppDataSource.initialize();
    logger.info('Database initialized');
    if (process.env.DB_SYNCHRONIZE === 'true') {
      await AppDataSource.synchronize();
      logger.info('Database schema synchronized');
    }
    process.exit(0);
  } catch (err) {
    logger.error('Failed to initialize database', { err });
    process.exit(1);
  }
})();
