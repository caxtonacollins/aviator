import { Server } from 'socket.io';
import { Round } from '../entities/round.entity.ts';
import { PlayerBet } from '../entities/player-bet.entity.ts';
import { AppDataSource } from '../config/database.ts';
import {
  generateCrashMultiplier,
  calculateCurrentMultiplier,
  calculatePlanePosition,
  generateServerSeed,
  hashServerSeed,
} from './game-utils.ts';
import { LeaderboardService } from './leaderboard.service.ts';
import { HistoryService } from './history.service.ts';

export class GameEngine {
  private io: Server;
  private currentRound: Round | null = null;
  private flyingInterval: NodeJS.Timeout | null = null;
  private bettingTimeout: NodeJS.Timeout | null = null;

  leaderboardService = new LeaderboardService();
  historyService = new HistoryService();

  constructor(io: Server) {
    this.io = io;

    this.io.on('connection', (socket) => {
      socket.emit('GAME_STATE_UPDATE', this.currentRound || null);

      socket.on('PLACE_BET', async (data: { address: string; amount: number }) => {
        try {
          await this.placeBet(data.address, data.amount);
          socket.emit('BET_PLACED', { success: true });
          this.broadcastGameState();
        } catch (err) {
          socket.emit('ERROR', { message: (err as Error).message });
        }
      });

      socket.on('CASH_OUT', async (data: { betId: number }) => {
        try {
          await this.cashOutById(data.betId);
          socket.emit('CASH_OUT_SUCCESS', { success: true });
          this.broadcastGameState();
        } catch (err) {
          socket.emit('ERROR', { message: (err as Error).message });
        }
      });
    });
  }

  private get roundRepo() {
    return AppDataSource.getRepository(Round);
  }

  private get betRepo() {
    return AppDataSource.getRepository(PlayerBet);
  }

  async start() {
    // ensure there is at least one round
    const r = await this.roundRepo.findOne({ order: { roundId: 'DESC' } });
    if (!r) {
      await this.startNewRound();
    } else if (r.phase === 'BETTING') {
      this.currentRound = r;
      this.broadcastGameState();
      this.scheduleFlyingPhase();
    } else if (r.phase === 'FLYING') {
      this.currentRound = r;
      this.broadcastGameState();
    }
  }

  async startNewRound() {
    const last = await this.roundRepo.findOne({ order: { roundId: 'DESC' } });
    const nextId = last ? last.roundId + 1 : 1;
    const serverSeed = generateServerSeed();
    const serverSeedHash = hashServerSeed(serverSeed);

    const round = this.roundRepo.create({
      roundId: nextId,
      phase: 'BETTING',
      startTime: Date.now(),
      flyStartTime: null,
      crashMultiplier: null,
      currentMultiplier: 1.0,
      serverSeed,
      serverSeedHash,
      totalBets: 0,
      totalPayouts: 0,
      settled: false,
      planePosition: { x: 10, y: 80 },
    });

    await this.roundRepo.save(round);
    this.currentRound = round;
    this.broadcastGameState();

    this.scheduleFlyingPhase();
  }

  private scheduleFlyingPhase() {
    if (this.bettingTimeout) clearTimeout(this.bettingTimeout);
    this.bettingTimeout = setTimeout(() => this.startFlyingPhase(), 10000);
  }

  async startFlyingPhase() {
    if (!this.currentRound || this.currentRound.phase !== 'BETTING') return;

    const targetCrash = generateCrashMultiplier(this.currentRound.serverSeed || '');
    const flyingDuration = Math.min(20000, Math.max(2000, targetCrash * 2000));

    this.currentRound.phase = 'FLYING';
    this.currentRound.flyStartTime = Date.now();
    await this.roundRepo.save(this.currentRound);

    const startTime = Date.now();

    if (this.flyingInterval) clearInterval(this.flyingInterval);

    this.flyingInterval = setInterval(async () => {
      const elapsed = Date.now() - startTime;

      this.currentRound!.currentMultiplier = calculateCurrentMultiplier(elapsed);
      this.currentRound!.planePosition = calculatePlanePosition(elapsed);

      // persist small updates occasionally
      if (elapsed % 1000 < 60) {
        await this.roundRepo.save(this.currentRound!);
      }

      this.broadcastGameState();

      if (
        elapsed >= flyingDuration ||
        this.currentRound!.currentMultiplier >= targetCrash
      ) {
        await this.crashRound(targetCrash);
      }
    }, 50);
  }

  async crashRound(crashMultiplier: number) {
    if (this.flyingInterval) {
      clearInterval(this.flyingInterval);
      this.flyingInterval = null;
    }

    if (!this.currentRound) return;

    this.currentRound.phase = 'CRASHED';
    this.currentRound.crashMultiplier = crashMultiplier;
    this.currentRound.currentMultiplier = crashMultiplier;

    // determine losers (non-cashed) and update leaderboard
    const players: PlayerBet[] = await this.betRepo.find({
      where: { round: { id: this.currentRound.id } },
    });

    for (const p of players) {
      if (!p.cashedOut) {
        p.payout = 0;
        await this.betRepo.save(p);
        await this.leaderboardService.updateFromBet({
          address: p.address,
          amount: Number(p.amount),
          cashedOut: false,
        });
      }
    }

    this.currentRound.settled = true;
    await this.roundRepo.save(this.currentRound);

    // record history
    await this.historyService.record({
      roundId: this.currentRound.roundId,
      crashMultiplier: Number(crashMultiplier),
      timestamp: Date.now(),
      totalBets: Number(this.currentRound.totalBets || 0),
      totalPayouts: Number(this.currentRound.totalPayouts || 0),
      winnersCount: players.filter((p) => p.cashedOut).length,
    });

    this.broadcastGameState();

    // new round after 30s
    setTimeout(() => this.startNewRound(), 30000);
  }

  async placeBet(address: string, amount: number) {
    if (!this.currentRound || this.currentRound.phase !== 'BETTING')
      throw new Error('Betting closed');
    const bet = this.betRepo.create({
      address,
      amount,
      cashedOut: false,
      cashoutMultiplier: null,
      payout: null,
      timestamp: Date.now(),
      round: this.currentRound,
    });
    await this.betRepo.save(bet);

    this.currentRound.totalBets =
      Number(this.currentRound.totalBets || 0) + Number(amount);
    await this.roundRepo.save(this.currentRound);

    // keep leaderboard updated with wager
    await this.leaderboardService.updateFromBet({ address, amount, cashedOut: false });

    this.broadcastGameState();

    return bet;
  }

  async cashOutById(betId: number) {
    const bet = await this.betRepo.findOne({
      where: { id: betId },
      relations: ['round'],
    });
    if (!bet) throw new Error('Bet not found');
    if (bet.cashedOut) throw new Error('Already cashed out');
    if (!this.currentRound || this.currentRound.phase !== 'FLYING')
      throw new Error('Cannot cash out now');

    bet.cashedOut = true;
    bet.cashoutMultiplier = this.currentRound.currentMultiplier;
    bet.payout = Number(bet.amount) * Number(bet.cashoutMultiplier || 1);
    await this.betRepo.save(bet);

    this.currentRound.totalPayouts =
      Number(this.currentRound.totalPayouts || 0) + Number(bet.payout || 0);
    await this.roundRepo.save(this.currentRound);

    await this.leaderboardService.updateFromBet({
      address: bet.address,
      amount: Number(bet.amount),
      cashedOut: true,
      payout: Number(bet.payout),
      cashoutMultiplier: Number(bet.cashoutMultiplier),
    });

    this.broadcastGameState();

    return bet;
  }

  broadcastGameState() {
    this.io.emit('GAME_STATE_UPDATE', this.currentRound);
  }
}
