import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'leaderboard' })
export class LeaderboardEntry {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  address!: string;

  @Column({ type: 'numeric', precision: 18, scale: 8, default: 0 })
  totalWagered!: number;

  @Column({ type: 'numeric', precision: 18, scale: 8, default: 0 })
  totalWon!: number;

  @Column({ type: 'int', default: 0 })
  gamesPlayed!: number;

  @Column({ type: 'numeric', precision: 18, scale: 8, default: 0 })
  biggestWin!: number;

  @Column({ type: 'numeric', precision: 10, scale: 4, default: 0 })
  biggestMultiplier!: number;

  @Column({ type: 'bigint', nullable: true })
  lastPlayed!: number | null;

  @UpdateDateColumn()
  updatedAt!: Date;
}
