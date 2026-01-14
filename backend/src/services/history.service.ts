import { AppDataSource } from '../config/database.ts';
import { GameHistory } from '../entities/game-history.entity.ts';
import { Repository } from 'typeorm';

export class HistoryService {
  private get repo(): Repository<GameHistory> {
    if (!AppDataSource.isInitialized) throw new Error('Database not initialized');
    return AppDataSource.getRepository(GameHistory);
  }

  async record(history: Partial<GameHistory>) {
    const entity = this.repo.create(history);
    return this.repo.save(entity);
  }

  async latest(limit = 20) {
    return this.repo
      .createQueryBuilder('h')
      .orderBy('h.timestamp', 'DESC')
      .limit(limit)
      .getMany();
  }
}
