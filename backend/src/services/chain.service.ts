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
  async placeBetFor(roundId: number, player: string, amount: number) {
    try {
      // Amount is in USDC (6 decimals)
      const betAmount = BigInt(Math.round(amount * 1e6));
      console.log('Placing bet on chain', { roundId, player, amount, betAmount: betAmount.toString() });

      logger.info('Placing bet on chain', { roundId, player, amount, betAmount: betAmount.toString() });

      const tx = await this.contract.placeBetFor(BigInt(roundId), player, betAmount);
      logger.info('Place bet tx submitted', { txHash: tx.hash });

      return tx.hash;
    } catch (err) {
      console.error('error', err);
      logger.error('Failed to place bet on chain', { error: (err as Error).message });
      throw err;
    }
  }

  async cashOutFor(roundId: number, player: string, payout: number, multiplier: number) {
    try {
      // Multiplier is scaled by 100 (e.g. 1.05x -> 105)
      const scaledMultiplier = BigInt(Math.round(multiplier * 100));
      // Payout is in USDC (6 decimals)
      const payoutAmount = BigInt(Math.round(payout * 1e6));

      logger.info('Cashing out on chain', { roundId, player, payout, multiplier, scaledMultiplier: scaledMultiplier.toString() });

      const tx = await this.contract.cashOutFor(BigInt(roundId), player, payoutAmount, scaledMultiplier);
      logger.info('Cashout tx submitted', { txHash: tx.hash });

      return tx.hash;
    } catch (err) {
      logger.error('Failed to cash out on chain', { error: (err as Error).message });
      throw err;
    }
  }

  async withdrawHouseProfits(amount: number) {
    try {
      // Amount is in USDC (6 decimals)
      const withdrawAmount = BigInt(Math.round(amount * 1e6));

      logger.info('Withdrawing house profits', { amount, withdrawAmount: withdrawAmount.toString() });

      const tx = await this.contract.withdrawHouseProfits(withdrawAmount);
      logger.info('Withdrawal tx submitted', { txHash: tx.hash });

      await tx.wait();
      logger.info('Withdrawal tx confirmed', { txHash: tx.hash });

      return tx.hash;
    } catch (err) {
      logger.error('Failed to withdraw house profits', { error: (err as Error).message });
      throw err;
    }
  }

  async getHouseBalance() {
    try {
      const usdcToken = await this.contract.usdcToken();
      const usdcContract = new ethers.Contract(
        usdcToken,
        ['function balanceOf(address) view returns (uint256)'],
        this.provider
      );

      const contractAddress = await this.contract.getAddress();
      console.log("contractAddress", contractAddress);
      const balance = await usdcContract.balanceOf(contractAddress);
      console.log("balance", balance);

      // Convert from USDC decimals (6) to human readable
      const balanceInUsdc = Number(balance) / 1e6;

      logger.info('House balance retrieved', { balance: balanceInUsdc });

      return balanceInUsdc;
    } catch (err) {
      logger.error('Failed to get house balance', { error: (err as Error).message });
      throw err;
    }
  }

  async getContractStatus() {
    try {
      const [owner, serverOperator, isPaused, contractAddress, ethBalance] = await Promise.all([
        this.contract.owner(),
        this.contract.serverOperator(),
        this.contract.paused(),
        this.contract.getAddress(),
        this.provider.getBalance(await this.contract.getAddress())
      ]);

      const usdcToken = await this.contract.usdcToken();
      const usdcBalance = await this.getHouseBalance();

      return {
        owner,
        serverOperator,
        isPaused,
        contractAddress,
        ethBalance: Number(ethBalance) / 1e18,
        usdcBalance,
        usdcToken
      };
    } catch (err) {
      logger.error('Failed to get contract status', { error: (err as Error).message });
      throw err;
    }
  }

  async pauseContract() {
    try {
      logger.info('Pausing contract');
      const tx = await this.contract.pause();
      await tx.wait();
      logger.info('Contract paused', { txHash: tx.hash });
      return tx.hash;
    } catch (err) {
      logger.error('Failed to pause contract', { error: (err as Error).message });
      throw err;
    }
  }

  async unpauseContract() {
    try {
      logger.info('Unpausing contract');
      const tx = await this.contract.unpause();
      await tx.wait();
      logger.info('Contract unpaused', { txHash: tx.hash });
      return tx.hash;
    } catch (err) {
      logger.error('Failed to unpause contract', { error: (err as Error).message });
      throw err;
    }
  }

  async setServerOperator(newOperator: string) {
    try {
      logger.info('Setting server operator', { newOperator });
      const tx = await this.contract.setServerOperator(newOperator);
      await tx.wait();
      logger.info('Server operator updated', { txHash: tx.hash, newOperator });
      return tx.hash;
    } catch (err) {
      logger.error('Failed to set server operator', { error: (err as Error).message });
      throw err;
    }
  }

  async fundHouse(amount: number) {
    try {
      const fundAmount = BigInt(Math.round(amount * 1e6));
      logger.info('Funding house', { amount, fundAmount: fundAmount.toString() });

      // First approve USDC transfer
      const usdcToken = await this.contract.usdcToken();
      const usdcContract = new ethers.Contract(
        usdcToken,
        [
          'function approve(address spender, uint256 amount) returns (bool)',
          'function allowance(address owner, address spender) view returns (uint256)'
        ],
        this.signer
      );

      const currentAllowance = await usdcContract.allowance(
        this.signer.address,
        await this.contract.getAddress()
      );

      if (currentAllowance < fundAmount) {
        logger.info('Approving USDC transfer');
        const approveTx = await usdcContract.approve(await this.contract.getAddress(), fundAmount);
        await approveTx.wait();
        logger.info('USDC approved', { txHash: approveTx.hash });
      }

      const tx = await this.contract.fundHouse(fundAmount);
      await tx.wait();
      logger.info('House funded', { txHash: tx.hash });
      return tx.hash;
    } catch (err) {
      logger.error('Failed to fund house', { error: (err as Error).message });
      throw err;
    }
  }

  async withdrawETH(to: string, amount: number) {
    try {
      const withdrawAmount = BigInt(Math.round(amount * 1e18));
      logger.info('Withdrawing ETH', { to, amount, withdrawAmount: withdrawAmount.toString() });

      const tx = await this.contract.withdrawETH(to, withdrawAmount);
      await tx.wait();
      logger.info('ETH withdrawn', { txHash: tx.hash });
      return tx.hash;
    } catch (err) {
      logger.error('Failed to withdraw ETH', { error: (err as Error).message });
      throw err;
    }
  }
}
