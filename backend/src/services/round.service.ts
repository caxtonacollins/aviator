import { AppDataSource } from '../config/database.ts';
import { Round } from '../entities/round.entity.ts';
import { PlayerBet } from '../entities/player-bet.entity.ts';
import { Repository } from 'typeorm';

export class RoundService {
  private get roundRepo(): Repository<Round> {
    if (!AppDataSource.isInitialized) throw new Error('Database not initialized');
    return AppDataSource.getRepository(Round);
  }

  private get betRepo(): Repository<PlayerBet> {
    if (!AppDataSource.isInitialized) throw new Error('Database not initialized');
    return AppDataSource.getRepository(PlayerBet);
  }

  async createRound(round: Partial<Round>) {
    const entity = this.roundRepo.create(round);
    return this.roundRepo.save(entity);
  }

  async getCurrentRound() {
    return this.roundRepo.findOne({ relations: ['players'], order: { roundId: 'DESC' } });
  }

  async addBet(roundId: number, bet: Partial<PlayerBet>) {
    const round = await this.roundRepo.findOneBy({ roundId });
    if (!round) throw new Error('Round not found');
    const betEntity = this.betRepo.create({ ...bet, round });
    return this.betRepo.save(betEntity);
  }

  async cashOut(betId: number, multiplier: number) {
    const bet = await this.betRepo.findOne({
      where: { id: betId },
      relations: ['round'],
    });
    if (!bet) throw new Error('Bet not found');
    bet.cashedOut = true;
    bet.cashoutMultiplier = multiplier;
    bet.payout = Number(bet.amount) * multiplier;
    await this.betRepo.save(bet);
    return bet;
  }
}
