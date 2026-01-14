import { AppDataSource } from '../config/database';
import { LeaderboardEntry } from '../entities/leaderboard.entity';
import { Repository } from 'typeorm';

export class LeaderboardService {
  private get repo(): Repository<LeaderboardEntry> {
    if (!AppDataSource.isInitialized) throw new Error('Database not initialized');
    return AppDataSource.getRepository(LeaderboardEntry);
  }

  async updateFromBet(bet: {
    address: string;
    amount: number;
    cashedOut: boolean;
    payout?: number | null;
    cashoutMultiplier?: number | null;
  }) {
    const addr = bet.address;
    let entry = await this.repo.findOneBy({ address: addr });

    if (!entry) {
      entry = this.repo.create({ address: addr });
    }

    entry.totalWagered = Number(entry.totalWagered || 0) + Number(bet.amount || 0);
    entry.gamesPlayed = (entry.gamesPlayed || 0) + 1;
    entry.lastPlayed = Date.now();

    if (bet.cashedOut && bet.payout) {
      const profit = Number(bet.payout) - Number(bet.amount);
      entry.totalWon = Number(entry.totalWon || 0) + profit;
      if (profit > Number(entry.biggestWin || 0)) entry.biggestWin = profit;
      if (
        bet.cashoutMultiplier &&
        Number(bet.cashoutMultiplier) > Number(entry.biggestMultiplier || 0)
      ) {
        entry.biggestMultiplier = Number(bet.cashoutMultiplier);
      }
    }

    return this.repo.save(entry);
  }

  async getTop(limit = 100) {
    return this.repo
      .createQueryBuilder('lb')
      .orderBy('lb.totalWon', 'DESC')
      .limit(limit)
      .getMany();
  }
}
