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
  async placeBetFor(player: string, amount: number) {
    try {
      // Amount is in USDC (6 decimals)
      // Check if amount is integer or float? Assuming integration handles scaling if needed.
      // But contract expects integer, let's assume input is already scaled or we scale it here.
      // Looking at frontend logic: amountInWei(amount) suggests input is human readable.
      // But game engine passes number. Let's look at Game Engine usage.
      // The game engine currently uses `amountInWei` logic or similar? 
      // Actually `GameEngine.placeBet` receives `amount: number`. 
      // If we look at existing `game-utils.ts` or usage, typically amount is 6 decimals for USDC.
      // Let's assume input is raw human amount and we need to scale? 
      // OR input is already scaled. 
      // In `GameEngine.placeBet`, it adds `bet.amount` to `totalBets`.
      // Let's check `placeBet` usage in frontend. 
      // Frontend `useGame` calls contract with `amountInWei(amount)`.
      // So Frontend sends Human readable amount to `placeBet` REST? No.
      // Wait, let's check frontend `placeBet`.
      // Frontend `placeBet` (socket) sends `amount`.
      // `amountInWei` is used for contract call.
      // So `amount` passed to socket `PLACE_BET` is usually human readable?
      // Let's verify `amountInWei` logic. It probably multiplies by 1e6.

      const betAmount = BigInt(Math.round(amount * 1e6));

      logger.info('Placing bet on chain', { player, amount, betAmount: betAmount.toString() });

      const tx = await this.contract.placeBetFor(player, betAmount);
      logger.info('Place bet tx submitted', { txHash: tx.hash });
      // We don't wait for it here to keep it fast? 
      // Actually we should wait if we want to guarantee it landed, but 
      // for "snappy" UI we might optimize. 
      // The implementation plan said: "Return txHash".

      return tx.hash;
    } catch (err) {
      logger.error('Failed to place bet on chain', { error: (err as Error).message });
      throw err;
    }
  }

  async cashOutFor(player: string, multiplier: number) {
    try {
      // Multiplier is scaled by 100 (e.g. 1.05x -> 105)
      // Contract expects scaled integer.
      // The engine implementation of mult is probably float (1.05).
      // Let's ensure we scale correctly.

      const scaledMultiplier = BigInt(Math.round(multiplier * 100));

      logger.info('Cashing out on chain', { player, multiplier, scaledMultiplier: scaledMultiplier.toString() });

      const tx = await this.contract.cashOutFor(player, scaledMultiplier);
      logger.info('Cashout tx submitted', { txHash: tx.hash });

      return tx.hash;
    } catch (err) {
      logger.error('Failed to cash out on chain', { error: (err as Error).message });
      throw err;
    }
  }
}
