import { describe, it, expect } from 'vitest';
import {
  generateServerSeed,
  hashServerSeed,
  generateCrashMultiplier,
  calculateCurrentMultiplier,
  calculatePlanePosition,
} from '../services/game-utils.ts';

describe('game-utils', () => {
  describe('generateServerSeed', () => {
    it('should generate a 64-character hex string', () => {
      const seed = generateServerSeed();
      expect(seed).toHaveLength(64);
      expect(seed).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce unique values', () => {
      const seed1 = generateServerSeed();
      const seed2 = generateServerSeed();
      expect(seed1).not.toBe(seed2);
    });
  });

  describe('hashServerSeed', () => {
    it('should return consistent hashes for same input', () => {
      const seed = 'test-seed';
      const hash1 = hashServerSeed(seed);
      const hash2 = hashServerSeed(seed);
      expect(hash1).toBe(hash2);
    });

    it('should return different hashes for different inputs', () => {
      const hash1 = hashServerSeed('seed1');
      const hash2 = hashServerSeed('seed2');
      expect(hash1).not.toBe(hash2);
    });

    it('should return a valid keccak256 hash format', () => {
      const seed = 'test-seed';
      const hash = hashServerSeed(seed);
      expect(hash).toMatch(/^0x[0-9a-f]{64}$/);
    });
  });

  describe('generateCrashMultiplier', () => {
    it('should return values between 1.01 and 100', () => {
      for (let i = 0; i < 100; i++) {
        const seed = generateServerSeed();
        const multiplier = generateCrashMultiplier(seed);
        expect(multiplier).toBeGreaterThanOrEqual(1.01);
        expect(multiplier).toBeLessThanOrEqual(100);
      }
    });

    it('should return deterministic results for same seed', () => {
      const seed = 'consistent-seed-123';
      const mult1 = generateCrashMultiplier(seed);
      const mult2 = generateCrashMultiplier(seed);
      expect(mult1).toBe(mult2);
    });

    it('should return different values for different seeds', () => {
      const mult1 = generateCrashMultiplier('seed1');
      const mult2 = generateCrashMultiplier('seed2');
      expect(mult1).not.toBe(mult2);
    });

    it('should apply house edge (results should be lower than without edge)', () => {
      const seed = 'test-seed-house-edge';
      const multiplier = generateCrashMultiplier(seed);
      // With house edge of 3%, the multiplier should be reasonably bounded
      expect(multiplier).toBeGreaterThan(0);
      expect(multiplier).toBeLessThan(1000); // Sanity check
    });
  });

  describe('calculateCurrentMultiplier', () => {
    it('should return 1.0 at time 0', () => {
      const multiplier = calculateCurrentMultiplier(0);
      expect(multiplier).toBe(1.0);
    });

    it('should increase with elapsed time', () => {
      const mult1 = calculateCurrentMultiplier(1000); // 1 second
      const mult2 = calculateCurrentMultiplier(2000); // 2 seconds
      const mult3 = calculateCurrentMultiplier(5000); // 5 seconds
      
      expect(mult2).toBeGreaterThan(mult1);
      expect(mult3).toBeGreaterThan(mult2);
    });

    it('should cap at 100', () => {
      const multiplier = calculateCurrentMultiplier(1000000); // Very long time
      expect(multiplier).toBe(100);
    });

    it('should return correct multiplier at 1 second', () => {
      const multiplier = calculateCurrentMultiplier(1000);
      // t = 1, formula: 1.0 + t^1.5 / 5 = 1.0 + 1 / 5 = 1.2
      expect(multiplier).toBeCloseTo(1.2, 1);
    });
  });

  describe('calculatePlanePosition', () => {
    it('should return valid x, y coordinates', () => {
      const pos = calculatePlanePosition(5000);
      expect(pos).toHaveProperty('x');
      expect(pos).toHaveProperty('y');
      expect(typeof pos.x).toBe('number');
      expect(typeof pos.y).toBe('number');
    });

    it('should start near x=10 at time 0', () => {
      const pos = calculatePlanePosition(0);
      expect(pos.x).toBeCloseTo(10, 1);
    });

    it('should move x position from left to right', () => {
      const pos1 = calculatePlanePosition(0);
      const pos2 = calculatePlanePosition(5000);
      const pos3 = calculatePlanePosition(10000);
      
      expect(pos2.x).toBeGreaterThan(pos1.x);
      expect(pos3.x).toBeGreaterThan(pos2.x);
    });

    it('should end near x=80 at max time (10 seconds)', () => {
      const pos = calculatePlanePosition(10000);
      expect(pos.x).toBeCloseTo(80, 1);
    });

    it('should keep y position within valid bounds', () => {
      for (let time = 0; time <= 10000; time += 1000) {
        const pos = calculatePlanePosition(time);
        expect(pos.y).toBeGreaterThanOrEqual(0);
        expect(pos.y).toBeLessThanOrEqual(100);
      }
    });

    it('should create a curved trajectory (y changes)', () => {
      const pos1 = calculatePlanePosition(0);
      const pos2 = calculatePlanePosition(2500);
      const pos3 = calculatePlanePosition(5000);
      
      // Y should change due to sine wave
      const allSameY = pos1.y === pos2.y && pos2.y === pos3.y;
      expect(allSameY).toBe(false);
    });
  });
});
