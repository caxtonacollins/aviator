import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { GameEngine } from '../services/game-engine.service.ts';
import { AppDataSource } from '../config/database.ts';
import { Round } from '../entities/round.entity.ts';
import { PlayerBet } from '../entities/player-bet.entity.ts';
import { Server } from 'socket.io';

// Mock Socket.IO server
const mockIo = {
  on: vi.fn(),
  emit: vi.fn(),
} as unknown as Server;

describe('GameEngine Service', () => {
  let gameEngine: GameEngine;

  beforeAll(async () => {
    // Initialize DB connection for tests
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    await AppDataSource.synchronize(true); // Clear DB/Schema
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  });

  beforeEach(async () => {
    // Clean up before each test
    await AppDataSource.synchronize(true);
    vi.clearAllMocks();
    
    // Instantiate engine
    gameEngine = new GameEngine(mockIo);
    
    // Wait for the async initialization (startNewRound) in constructor to complete
    // Since it's not awaited in constructor, we wait a bit or retry
    await new Promise(resolve => setTimeout(resolve, 200));
  });

  it('instantiates successfully', () => {
    expect(gameEngine).toBeDefined();
  });
});
