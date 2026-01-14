import request from 'supertest';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import app from '../index.ts';
import { AppDataSource } from '../config/database.ts';

beforeAll(async () => {
  await AppDataSource.initialize();
  await AppDataSource.synchronize(true);
});

afterAll(async () => {
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
});

describe('API basic flows', () => {
  it('GET current round (should return seed round)', async () => {
    const res = await request(app).get('/api/rounds/current');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.round).toBeDefined();
  });

  it('POST place bet -> increases totalBets', async () => {
    // get current round
    const current = await request(app).get('/api/rounds/current');
    const round = current.body.round;
    const res = await request(app)
      .post(`/api/rounds/${round.roundId}/bets`)
      .send({ address: '0xabc', amount: 0.01 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const after = await request(app).get('/api/rounds/current');
    expect(Number(after.body.round.totalBets)).toBeGreaterThanOrEqual(0.01);
  });
});
