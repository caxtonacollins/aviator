import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1738000000000 implements MigrationInterface {
  name = 'InitialSchema1738000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create rounds table
    await queryRunner.query(`
      CREATE TABLE "rounds" (
        "id" SERIAL PRIMARY KEY,
        "roundId" INTEGER NOT NULL UNIQUE,
        "phase" VARCHAR(50) NOT NULL,
        "startTime" BIGINT NOT NULL,
        "flyStartTime" BIGINT,
        "crashMultiplier" NUMERIC(10, 4),
        "currentMultiplier" NUMERIC(10, 4) NOT NULL DEFAULT 1.0,
        "serverSeed" TEXT,
        "serverSeedHash" TEXT,
        "totalBets" NUMERIC(18, 8) NOT NULL DEFAULT 0,
        "totalPayouts" NUMERIC(18, 8) NOT NULL DEFAULT 0,
        "settled" BOOLEAN NOT NULL DEFAULT false,
        "planePosition" JSONB,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // Create index on roundId for faster lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_rounds_roundId" ON "rounds" ("roundId")
    `);

    // Create index on phase for filtering
    await queryRunner.query(`
      CREATE INDEX "IDX_rounds_phase" ON "rounds" ("phase")
    `);

    // Create player_bets table
    await queryRunner.query(`
      CREATE TABLE "player_bets" (
        "id" SERIAL PRIMARY KEY,
        "address" VARCHAR(64) NOT NULL,
        "amount" NUMERIC(18, 8) NOT NULL,
        "cashedOut" BOOLEAN NOT NULL DEFAULT false,
        "cashoutMultiplier" NUMERIC(10, 4),
        "payout" NUMERIC(18, 8),
        "txHash" VARCHAR(128),
        "timestamp" BIGINT NOT NULL,
        "roundId" INTEGER,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_player_bets_round" FOREIGN KEY ("roundId") 
          REFERENCES "rounds"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes for player_bets
    await queryRunner.query(`
      CREATE INDEX "IDX_player_bets_address" ON "player_bets" ("address")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_player_bets_roundId" ON "player_bets" ("roundId")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_player_bets_txHash" ON "player_bets" ("txHash")
    `);

    // Create game_history table
    await queryRunner.query(`
      CREATE TABLE "game_history" (
        "id" SERIAL PRIMARY KEY,
        "roundId" INTEGER NOT NULL,
        "crashMultiplier" NUMERIC(10, 4) NOT NULL,
        "timestamp" BIGINT NOT NULL,
        "totalBets" NUMERIC(18, 8) NOT NULL,
        "totalPayouts" NUMERIC(18, 8) NOT NULL,
        "winnersCount" INTEGER NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // Create index on roundId for game_history
    await queryRunner.query(`
      CREATE INDEX "IDX_game_history_roundId" ON "game_history" ("roundId")
    `);

    // Create index on timestamp for sorting
    await queryRunner.query(`
      CREATE INDEX "IDX_game_history_timestamp" ON "game_history" ("timestamp")
    `);

    // Create leaderboard table
    await queryRunner.query(`
      CREATE TABLE "leaderboard" (
        "address" VARCHAR(64) PRIMARY KEY,
        "totalWagered" NUMERIC(18, 8) NOT NULL DEFAULT 0,
        "totalWon" NUMERIC(18, 8) NOT NULL DEFAULT 0,
        "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
        "biggestWin" NUMERIC(18, 8) NOT NULL DEFAULT 0,
        "biggestMultiplier" NUMERIC(10, 4) NOT NULL DEFAULT 0,
        "lastPlayed" BIGINT,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // Create indexes for leaderboard sorting
    await queryRunner.query(`
      CREATE INDEX "IDX_leaderboard_totalWon" ON "leaderboard" ("totalWon")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_leaderboard_biggestWin" ON "leaderboard" ("biggestWin")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_leaderboard_biggestMultiplier" ON "leaderboard" ("biggestMultiplier")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse order (respecting foreign keys)
    await queryRunner.query(`DROP TABLE IF EXISTS "leaderboard"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "game_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "player_bets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "rounds"`);
  }
}
