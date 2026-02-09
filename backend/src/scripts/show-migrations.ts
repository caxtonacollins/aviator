import { AppDataSource } from '../config/database.js';
import { logger } from '../utils/logger.js';

async function showMigrations() {
  try {
    logger.info('Initializing database connection...');
    await AppDataSource.initialize();
    
    logger.info('Fetching migration status...');
    const migrations = await AppDataSource.showMigrations();
    
    if (migrations) {
      logger.info('There are pending migrations');
    } else {
      logger.info('All migrations have been run');
    }
    
    await AppDataSource.destroy();
    logger.info('Database connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Failed to show migrations:', error);
    await AppDataSource.destroy().catch(() => {});
    process.exit(1);
  }
}

showMigrations();
