import { describe, it, expect } from 'vitest';
import { ZeroHash } from 'ethers';
import {
  makeLeaf,
  computeMerkleRootFromLeaves,
  computePlayersMerkleRoot,
} from '../services/merkle.ts';
import type { PlayerBet } from '../entities/player-bet.entity.ts';

describe('Merkle Tree Functions', () => {
  describe('makeLeaf', () => {
    it('should generate consistent hashes for same player bet', () => {
      const bet = {
        id: 1,
        address: '0x1234567890123456789012345678901234567890',
        amount: 100,
        cashedOut: false,
        cashoutMultiplier: null,
        payout: null,
        timestamp: 1234567890,
        txHash: null,
      } as PlayerBet;

      const leaf1 = makeLeaf(bet);
      const leaf2 = makeLeaf(bet);
      
      expect(leaf1).toBe(leaf2);
    });

    it('should normalize addresses to lowercase', () => {
      const betUppercase = {
        id: 1,
        address: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12',
        amount: 100,
        cashedOut: false,
        cashoutMultiplier: null,
        payout: null,
        timestamp: 1234567890,
        txHash: null,
      } as PlayerBet;

      const betLowercase = {
        ...betUppercase,
        address: '0xabcdef1234567890abcdef1234567890abcdef12',
      } as PlayerBet;

      const leaf1 = makeLeaf(betUppercase);
      const leaf2 = makeLeaf(betLowercase);
      
      expect(leaf1).toBe(leaf2);
    });

    it('should return different hashes for different bets', () => {
      const bet1 = {
        id: 1,
        address: '0x1111111111111111111111111111111111111111',
        amount: 100,
        cashedOut: false,
        cashoutMultiplier: null,
        payout: null,
        timestamp: 1234567890,
        txHash: null,
      } as PlayerBet;

      const bet2 = {
        ...bet1,
        address: '0x2222222222222222222222222222222222222222',
      } as PlayerBet;

      const leaf1 = makeLeaf(bet1);
      const leaf2 = makeLeaf(bet2);
      
      expect(leaf1).not.toBe(leaf2);
    });

    it('should include cashout data in hash when present', () => {
      const betNoCashout = {
        id: 1,
        address: '0x1234567890123456789012345678901234567890',
        amount: 100,
        cashedOut: false,
        cashoutMultiplier: null,
        payout: null,
        timestamp: 1234567890,
        txHash: null,
      } as PlayerBet;

      const betWithCashout = {
        ...betNoCashout,
        cashedOut: true,
        cashoutMultiplier: 2.5,
        payout: 250,
      } as PlayerBet;

      const leaf1 = makeLeaf(betNoCashout);
      const leaf2 = makeLeaf(betWithCashout);
      
      expect(leaf1).not.toBe(leaf2);
    });

    it('should return a valid keccak256 hash format', () => {
      const bet = {
        id: 1,
        address: '0x1234567890123456789012345678901234567890',
        amount: 100,
        cashedOut: false,
        cashoutMultiplier: null,
        payout: null,
        timestamp: 1234567890,
        txHash: null,
      } as PlayerBet;

      const leaf = makeLeaf(bet);
      expect(leaf).toMatch(/^0x[0-9a-f]{64}$/);
    });
  });

  describe('computeMerkleRootFromLeaves', () => {
    it('should return ZeroHash for empty array', () => {
      const root = computeMerkleRootFromLeaves([]);
      expect(root).toBe(ZeroHash);
    });

    it('should compute correct root for single leaf', () => {
      const leaf = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const root = computeMerkleRootFromLeaves([leaf]);
      
      expect(root).toBeDefined();
      expect(root).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it('should compute deterministic root for multiple leaves', () => {
      const leaves = [
        '0x1111111111111111111111111111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222222222222222222222222222',
        '0x3333333333333333333333333333333333333333333333333333333333333333',
      ];

      const root1 = computeMerkleRootFromLeaves(leaves);
      const root2 = computeMerkleRootFromLeaves(leaves);
      
      expect(root1).toBe(root2);
    });

    it('should handle odd number of leaves by duplicating last', () => {
      const leavesOdd = [
        '0x1111111111111111111111111111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222222222222222222222222222',
        '0x3333333333333333333333333333333333333333333333333333333333333333',
      ];

      const root = computeMerkleRootFromLeaves(leavesOdd);
      
      expect(root).toBeDefined();
      expect(root).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it('should produce different roots for different leaf orders', () => {
      const leaves1 = [
        '0x1111111111111111111111111111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222222222222222222222222222',
      ];

      const leaves2 = [
        '0x2222222222222222222222222222222222222222222222222222222222222222',
        '0x1111111111111111111111111111111111111111111111111111111111111111',
      ];

      const root1 = computeMerkleRootFromLeaves(leaves1);
      const root2 = computeMerkleRootFromLeaves(leaves2);
      
      expect(root1).not.toBe(root2);
    });

    it('should handle power-of-two leaf counts', () => {
      const leaves = [
        '0x1111111111111111111111111111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222222222222222222222222222',
        '0x3333333333333333333333333333333333333333333333333333333333333333',
        '0x4444444444444444444444444444444444444444444444444444444444444444',
      ];

      const root = computeMerkleRootFromLeaves(leaves);
      
      expect(root).toBeDefined();
      expect(root).toMatch(/^0x[0-9a-f]{64}$/);
    });
  });

  describe('computePlayersMerkleRoot', () => {
    it('should generate root from player bet array', () => {
      const players: PlayerBet[] = [
        {
          id: 1,
          address: '0x1111111111111111111111111111111111111111',
          amount: 100,
          cashedOut: false,
          cashoutMultiplier: null,
          payout: null,
          timestamp: 1234567890,
          txHash: null,
        } as PlayerBet,
        {
          id: 2,
          address: '0x2222222222222222222222222222222222222222',
          amount: 200,
          cashedOut: true,
          cashoutMultiplier: 2.5,
          payout: 500,
          timestamp: 1234567891,
          txHash: '0xabc',
        } as PlayerBet,
      ];

      const root = computePlayersMerkleRoot(players);
      
      expect(root).toBeDefined();
      expect(root).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it('should return ZeroHash for empty player array', () => {
      const root = computePlayersMerkleRoot([]);
      expect(root).toBe(ZeroHash);
    });

    it('should produce consistent roots for same player data', () => {
      const players: PlayerBet[] = [
        {
          id: 1,
          address: '0x1111111111111111111111111111111111111111',
          amount: 100,
          cashedOut: false,
          cashoutMultiplier: null,
          payout: null,
          timestamp: 1234567890,
          txHash: null,
        } as PlayerBet,
      ];

      const root1 = computePlayersMerkleRoot(players);
      const root2 = computePlayersMerkleRoot(players);
      
      expect(root1).toBe(root2);
    });

    it('should produce different roots for different player data', () => {
      const players1: PlayerBet[] = [
        {
          id: 1,
          address: '0x1111111111111111111111111111111111111111',
          amount: 100,
          cashedOut: false,
          cashoutMultiplier: null,
          payout: null,
          timestamp: 1234567890,
          txHash: null,
        } as PlayerBet,
      ];

      const players2: PlayerBet[] = [
        {
          id: 1,
          address: '0x2222222222222222222222222222222222222222',
          amount: 100,
          cashedOut: false,
          cashoutMultiplier: null,
          payout: null,
          timestamp: 1234567890,
          txHash: null,
        } as PlayerBet,
      ];

      const root1 = computePlayersMerkleRoot(players1);
      const root2 = computePlayersMerkleRoot(players2);
      
      expect(root1).not.toBe(root2);
    });
  });
});
