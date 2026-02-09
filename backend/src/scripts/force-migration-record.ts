import { AppDataSource } from '../config/database.js';

async function forceMigration() {
  try {
    await AppDataSource.initialize();
    const queryRunner = AppDataSource.createQueryRunner();
    
    // Check if migration exists
    const existing = await queryRunner.query(
      `SELECT * FROM migrations WHERE name = 'InitialSchema1738000000000'`
    );
    
    if (existing.length === 0) {
      console.log('Inserting migration record...');
      // timestamp is bigint, effectively checks out
      await queryRunner.query(
        `INSERT INTO migrations ("timestamp", "name") VALUES (1738000000000, 'InitialSchema1738000000000')`
      );
      console.log('Successfully inserted migration record.');
    } else {
      console.log('Migration record already exists.');
    }
    
    await AppDataSource.destroy();
  } catch (err) {
    console.error('Error forcing migration:', err);
    process.exit(1);
  }
}

forceMigration();
