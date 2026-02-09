import { AppDataSource } from '../config/database.js';
import { logger } from '../utils/logger.js';

async function revertMigration() {
  try {
    logger.info('Initializing database connection...');
    await AppDataSource.initialize();
    
    logger.info('Reverting last migration...');
    await AppDataSource.undoLastMigration();
    logger.info('Migration reverted successfully');
    
    await AppDataSource.destroy();
    logger.info('Database connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Migration revert failed:', error);
    await AppDataSource.destroy().catch(() => {});
    process.exit(1);
  }
}

revertMigration();
