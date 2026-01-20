import { ethers, type InterfaceAbi } from 'ethers';
import { computePlayersMerkleRoot } from './merkle.ts';
import aviatorAbi from '../abi/aviator.json' with { type: 'json' };

const aviatorAbiTyped = aviatorAbi as unknown as InterfaceAbi;
import type { Round } from '../entities/round.entity.ts';
import type { PlayerBet } from '../entities/player-bet.entity.ts';
import { logger } from '@/utils/logger.ts';

export class ChainService {
  provider: ethers.JsonRpcProvider;
  signer: ethers.Wallet;
  contract: ethers.Contract;

  constructor() {
    const rpc = process.env.BACKEND_RPC_URL;
    const key = process.env.BACKEND_PRIVATE_KEY;
    const addr = process.env.AVIATOR_CONTRACT_ADDRESS;
    if (!rpc || !key || !addr)
      throw new Error(
        'ChainService missing env vars: BACKEND_RPC_URL,BACKEND_PRIVATE_KEY,AVIATOR_CONTRACT_ADDRESS'
      );

    this.provider = new ethers.JsonRpcProvider(rpc);
    this.signer = new ethers.Wallet(key, this.provider);
    this.contract = new ethers.Contract(addr, aviatorAbiTyped, this.signer);
  }

  /**
   * Build a snapshot for a settled round and submit to chain.
   * Note: rounds' numeric fields are converted to on-chain units here (USDC with 6 decimals, crash scaled by 100).
   */
  async submitRoundSnapshot(round: Round, players: PlayerBet[]) {
    if (players.length === 0) {
      logger.warn('Cannot submit snapshot: no players in round', {
        roundId: round.roundId
      });
      return;
    }
    try {
      const playersMerkleRoot = computePlayersMerkleRoot(players);

      console.log('playersMerkleRoot', playersMerkleRoot);

      const crashScaled = round.crashMultiplier
        ? Math.round(Number(round.crashMultiplier) * 100)
        : 0;
      const totalBetsUint = BigInt(Math.round(Number(round.totalBets || 0) * 1e6));
      const totalPayoutsUint = BigInt(Math.round(Number(round.totalPayouts || 0) * 1e6));
      const numPlayers = Number(round.players?.length || players.length || 0);

      const serverSeedHash = round.serverSeedHash
        ? round.serverSeedHash
        : ethers.ZeroHash;

      const snapshotHash = ethers.keccak256(
        ethers.solidityPacked(
          ['uint256', 'bytes32', 'uint256', 'uint256', 'bytes32', 'uint32'],
          [
            BigInt(round.roundId),
            serverSeedHash,
            BigInt(crashScaled),
            totalBetsUint,
            playersMerkleRoot,
            numPlayers,
          ]
        )
      );

      console.log('snapshotHash', snapshotHash);

      // submit transaction (fire-and-forget style but return the tx promise)
      console.log('Submitting round snapshot tx', {
        roundId: round.roundId,
        playersMerkleRoot,
        totalBetsUint,
        totalPayoutsUint,
        numPlayers,
        serverSeedHash,
        crashScaled,
        snapshotHash,
      });
      const tx = await this.contract.snapshotRound(
        BigInt(round.roundId),
        snapshotHash,
        playersMerkleRoot,
        totalBetsUint,
        totalPayoutsUint,
        numPlayers
      );

      console.log("tx", tx);

      logger.info('Submitted round snapshot tx', {
        roundId: round.roundId,
        txHash: tx.hash,
      });
      await tx.wait();
      logger.info('Snapshot tx confirmed', { roundId: round.roundId, txHash: tx.hash });
      return tx;
    } catch (err) {
      logger.error('Failed to submit round snapshot', { error: (err as Error).message });
      throw err;
    }
  }
}
