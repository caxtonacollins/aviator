import { concat, toUtf8Bytes, keccak256, ZeroHash } from 'ethers';
import type { PlayerBet } from '../entities/player-bet.entity.ts';

// Creates a deterministic leaf for a player bet
export function makeLeaf(p: PlayerBet): string {
  // canonical serialization as utf8 bytes (must be consistent between off-chain producer and verifier)
  const payload = JSON.stringify({
    address: p.address.toLowerCase(),
    amount: Number(p.amount).toString(),
    cashedOut: !!p.cashedOut,
    cashoutMultiplier: p.cashoutMultiplier || 0,
    payout: p.payout || 0,
    timestamp: p.timestamp,
  });
  return keccak256(toUtf8Bytes(payload));
}

export function computeMerkleRootFromLeaves(leaves: string[]): string {
  if (leaves.length === 0) return ZeroHash;
  let nodes = leaves.slice();
  while (nodes.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < nodes.length; i += 2) {
      if (i + 1 === nodes.length) {
        // duplicate last when odd
        next.push(keccak256(concat([nodes[i], nodes[i]])));
      } else {
        // canonical order: concat left||right
        next.push(keccak256(concat([nodes[i], nodes[i + 1]])));
      }
    }
    nodes = next;
  }
  return nodes[0];
}

export function computePlayersMerkleRoot(players: PlayerBet[]): string {
  const leaves = players.map(makeLeaf);
  return computeMerkleRootFromLeaves(leaves);
}
