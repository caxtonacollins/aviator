import 'reflect-metadata';
import { AppDataSource } from '../config/database.ts';
import { Round } from '../entities/round.entity.ts';
import { logger } from '../utils/logger.ts';

(async () => {
  try {
    const ds = await AppDataSource.initialize();
    logger.info('DB connected for seeding');

    const roundRepo = ds.getRepository(Round);

    const r = roundRepo.create({
      roundId: 1,
      phase: 'BETTING',
      startTime: Date.now(),
      flyStartTime: null,
      crashMultiplier: null,
      currentMultiplier: 1.0,
      serverSeed: null,
      serverSeedHash: null,
      totalBets: 0,
      totalPayouts: 0,
      settled: false,
      planePosition: { x: 10, y: 80 },
    });

    await roundRepo.save(r);

    logger.info('Seed completed');
    process.exit(0);
  } catch (err) {
    logger.error('Seeding failed', { err });
    process.exit(1);
  }
})();
