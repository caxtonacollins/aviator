import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTxHashToPlayerBets1680000000000 implements MigrationInterface {
  name = 'AddTxHashToPlayerBets1680000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "player_bets" ADD COLUMN "txHash" character varying(128)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "player_bets" DROP COLUMN "txHash"`);
  }
}
