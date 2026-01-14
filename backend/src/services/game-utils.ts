import crypto from 'crypto';
import { ethers } from 'ethers';

export function generateServerSeed(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashServerSeed(seed: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(seed));
}

const HOUSE_EDGE = 0.03; // 3%

export function generateCrashMultiplier(serverSeed: string): number {
  const hash = crypto.createHash('sha256').update(serverSeed).digest('hex');
  const hashNumber = parseInt(hash.substring(0, 13), 16);
  const maxNumber = parseInt('fffffffffffff', 16);
  let random = hashNumber / maxNumber;

  // Apply house edge
  random = random * (1 - HOUSE_EDGE);

  if (random === 0) random = 0.0001;
  const crashPoint = Math.floor((99 / (1 - random) / 100) * 100) / 100;

  return Math.max(1.01, Math.min(100, crashPoint));
}

export function calculateCurrentMultiplier(elapsedMs: number): number {
  const t = elapsedMs / 1000;
  return Math.min(1.0 + Math.pow(t, 1.5) / 5, 100);
}

export function calculatePlanePosition(elapsedMs: number): { x: number; y: number } {
  const progress = Math.min(elapsedMs / 10000, 1);
  const x = 10 + progress * 70;
  const y = 80 - Math.sin(progress * Math.PI * 0.8) * 50;
  return { x, y };
}
