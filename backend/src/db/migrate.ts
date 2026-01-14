import 'reflect-metadata';
import { AppDataSource } from '../config/database.ts';
import { logger } from '../utils/logger.ts';

(async () => {
  try {
    const ds = await AppDataSource.initialize();
    logger.info('Database initialized for migrations');
    const migrations = await ds.runMigrations();
    logger.info(`Migrations executed: ${migrations.length}`);
    process.exit(0);
  } catch (err) {
    logger.error('Migration failed', { err });
    process.exit(1);
  }
})();
