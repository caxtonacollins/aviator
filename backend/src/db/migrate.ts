import 'reflect-metadata';
import { AppDataSource } from '../config/database.js';
import { logger } from '../utils/logger.js';

(async () => {
  try {
    logger.info('Initializing database connection...');
    const ds = await AppDataSource.initialize();
    logger.info('Database initialized for migrations');
    logger.info('Running migrations...');
    const migrations = await ds.runMigrations();
    logger.info(`Migrations executed: ${migrations.length}`);
    migrations.forEach((migration) => {
      logger.info(`  - ${migration.name}`);
    });
    await ds.destroy();
    process.exit(0);
  } catch (err) {
    logger.error('Migration failed');
    console.error(err);
    process.exit(1);
  }
})();
