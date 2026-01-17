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
import { logger } from '@/utils/logger.ts';

export class GameEngine {
  private isRunning = false;
  private io: Server;
  private currentRound: Round | null = null;
  private flyingInterval: NodeJS.Timeout | null = null;
  private bettingTimeout: NodeJS.Timeout | null = null;

  leaderboardService = new LeaderboardService();
  historyService = new HistoryService();

  constructor(io: Server) {
    this.io = io;

    this.initializeEngine().catch((error) => {
      logger.error('Failed to initialize game engine', { error });
    });

    this.io.on('connection', (socket) => {
      (async () => {
        try {
          // Fetch current round with player relations on connection
          const round = await this.roundRepo.findOne({
            where: {},
            relations: ['players'],
            order: { roundId: 'DESC' },
          });
          const roundData = round
            ? {
                ...round,
                players: round.players || [],
              }
            : this.currentRound;
          socket.emit('GAME_STATE_UPDATE', roundData);
        } catch (error) {
          logger.error('Failed to emit initial game state', { error });
          socket.emit('GAME_STATE_UPDATE', this.currentRound || null);
        }
      })();

      socket.on(
        'PLACE_BET',
        async (data: { address: string; amount: number; txHash?: string }) => {
          try {
            await this.placeBet(data.address, data.amount, data.txHash);
            socket.emit('BET_PLACED', { success: true });
            await this.broadcastGameState();
          } catch (err) {
            socket.emit('ERROR', { message: (err as Error).message });
          }
        }
      );

      socket.on('CASH_OUT', async (data: { betId: number }) => {
        try {
          await this.cashOutById(data.betId);
          socket.emit('CASH_OUT_SUCCESS', { success: true });
          await this.broadcastGameState();
        } catch (err) {
          socket.emit('ERROR', { message: (err as Error).message });
        }
      });
    });
  }

  private async initializeEngine() {
    try {
      // Ensure database is connected
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }
      this.isRunning = true;
      logger.info('Game engine initialized');
      await this.startNewRound();
    } catch (error) {
      logger.error('Failed to initialize game engine', { error });
      throw error;
    }
  }

  private get roundRepo() {
    return AppDataSource.getRepository(Round);
  }

  private get betRepo() {
    return AppDataSource.getRepository(PlayerBet);
  }

  async start() {
    // ensure there is at least one round
    const r = await this.roundRepo.findOne({ where: {}, order: { roundId: 'DESC' } });
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

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 5,
    baseDelayMs = 100,
    attempt = 1
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      if (attempt >= maxRetries) {
        logger.error('Max retries reached, giving up', { attempt, maxRetries, error });
        throw error;
      }

      // Exponential backoff with jitter
      const delayMs = Math.min(
        1000, // max delay of 1 second
        baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 100
      );

      logger.warn(`Operation failed, retrying (${attempt}/${maxRetries})`, {
        error: error.message,
        nextRetryIn: `${delayMs}ms`,
      });

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return this.executeWithRetry(operation, maxRetries, baseDelayMs, attempt + 1);
    }
  }

  async startNewRound(): Promise<Round> {
    return this.executeWithRetry<Round>(
      async () => {
        const queryRunner = AppDataSource.createQueryRunner();

        try {
          await queryRunner.connect();
          await queryRunner.startTransaction('SERIALIZABLE'); // Use SERIALIZABLE isolation level

          // Get the latest round with a lock
          const last = await queryRunner.manager.findOne(Round, {
            where: {},
            order: { roundId: 'DESC' },
            lock: { mode: 'pessimistic_write' },
          });

          // Double check if a new round was created while we were waiting for the lock
          if (this.currentRound && (!last || this.currentRound.id !== last.id)) {
            logger.info('A new round was already created, returning existing round');
            return this.currentRound;
          }

          const nextId = last ? last.roundId + 1 : 1;
          const serverSeed = generateServerSeed();
          const serverSeedHash = hashServerSeed(serverSeed);

          logger.info(`Creating new round with ID: ${nextId}`);

          const round = this.roundRepo.create({
            roundId: nextId,
            phase: 'BETTING',
            startTime: Date.now(),
            flyStartTime: Date.now() + 10000,
            crashMultiplier: null,
            currentMultiplier: 1.0,
            serverSeed,
            serverSeedHash,
            totalBets: 0,
            totalPayouts: 0,
            settled: false,
            planePosition: { x: 10, y: 80 },
          });

          await queryRunner.manager.save(round);
          await queryRunner.commitTransaction();

          this.currentRound = round;
          this.broadcastGameState();
          this.scheduleFlyingPhase();

          logger.info(
            `Successfully created new round with ID: ${round.id}, Round ID: ${round.roundId}`
          );
          return round;
        } catch (error: any) {
          await queryRunner.rollbackTransaction().catch((rollbackError) => {
            logger.error('Failed to rollback transaction', { error: rollbackError });
          });

          if (
            error.code === '23505' ||
            error.message.includes('duplicate key') ||
            error.code === '40001' /* serialization_failure */
          ) {
            throw error; // Will be caught by executeWithRetry
          }

          logger.error('Unexpected error in startNewRound', { error });
          throw error;
        } finally {
          await queryRunner.release().catch((releaseError) => {
            logger.error('Failed to release query runner', { error: releaseError });
          });
        }
      },
      5,
      100
    ); // 5 retries, starting with 100ms delay
  }

  private scheduleFlyingPhase() {
    if (this.bettingTimeout) clearTimeout(this.bettingTimeout);
    // If a scheduled flyStartTime exists (e.g., after restart), use the remaining time
    const now = Date.now();
    const remainingMs =
      this.currentRound && this.currentRound.flyStartTime
        ? Math.max(0, Number(this.currentRound.flyStartTime) - now)
        : 10000;

    logger.info(
      `Scheduling flying phase in ${remainingMs}ms for round ${this.currentRound?.roundId}`
    );

    this.bettingTimeout = setTimeout(() => this.startFlyingPhase(), remainingMs);
  }

  async startFlyingPhase() {
    if (!this.currentRound || this.currentRound.phase !== 'BETTING') {
      logger.info('startFlyingPhase aborted: no current betting round');
      return;
    }

    const targetCrash = generateCrashMultiplier(this.currentRound.serverSeed || '');
    const flyingDuration = Math.min(20000, Math.max(2000, targetCrash * 2000));

    logger.info(
      `Starting flying phase for round ${this.currentRound.roundId} targetCrash=${targetCrash} duration=${flyingDuration}ms`
    );

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

      await this.broadcastGameState();

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

    // Broadcast updated history to all clients
    const latestHistory = await this.historyService.latest(28);
    this.io.emit('HISTORY_UPDATE', latestHistory);

    this.broadcastGameState();

    // new round after 30s
    setTimeout(() => this.startNewRound(), 30000);
  }

  async placeBet(address: string, amount: number, txHash?: string) {
    if (!this.currentRound || this.currentRound.phase !== 'BETTING')
      throw new Error('Betting closed');
    const bet = this.betRepo.create({
      address,
      amount,
      cashedOut: false,
      cashoutMultiplier: null,
      payout: null,
      txHash: txHash || null,
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

  async broadcastGameState() {
    try {
      // Fetch the current round with player relations to ensure we have the latest data
      if (this.currentRound) {
        const roundWithPlayers = await this.roundRepo.findOne({
          where: { id: this.currentRound.id },
          relations: ['players'],
        });
        if (roundWithPlayers) {
          // Convert to plain object to ensure proper serialization for Socket.IO
          const roundData = {
            ...roundWithPlayers,
            players: roundWithPlayers.players || [],
          };
          this.io.emit('GAME_STATE_UPDATE', roundData);
        } else {
          this.io.emit('GAME_STATE_UPDATE', this.currentRound);
        }
      }
    } catch (error) {
      logger.error('Failed to broadcast game state', { error });
      // Fallback: broadcast current round without relations if query fails
      this.io.emit('GAME_STATE_UPDATE', this.currentRound);
    }
  }
}
