import { useCallback, useEffect, useState } from 'react';
import { useWalletClient, usePublicClient } from 'wagmi';
import { parseUnits } from 'viem';
import { useAccount } from 'wagmi';
import { setOnchainKitConfig } from '@coinbase/onchainkit';
import { APIError, getPortfolios } from '@coinbase/onchainkit/api';
import { pay, getPaymentStatus } from '@base-org/account';
import ERC20_ABI from '@/abis/usdc.json';

interface TokenBalance {
  address: string;
  chainId: number;
  decimals: number;
  name: string;
  symbol: string;
  cryptoBalance: string;
  fiatBalance: string;
  image?: string;
}

interface Portfolio {
  address: string;
  tokenBalances: TokenBalance[];
  portfolioBalanceInUsd: string;
}

interface PortfolioResponse {
  portfolios: Portfolio[];
}

export default function useUSDC() {
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [balance, setBalance] = useState<number | null>(null);
  const usdcAddress = (process.env.NEXT_PUBLIC_USDC_ADDRESS || '') as `0x${string}`;
  const houseAddress = process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS as `0x${string}` | undefined;
  const baseAddress = process.env.NEXT_PUBLIC_BASE_ADDRESS as `0x${string}` | undefined;
  const decimals = 6;
  setOnchainKitConfig({ apiKey: process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY || '' });


  // Approve USDC spending for a specific contract
  const approveUSDC = useCallback(async (spender: string, amount: number) => {
    if (!walletClient?.account?.address || !publicClient) {
      throw new Error('Wallet not connected');
    }

    try {
      const amountInWei = parseUnits(amount.toString(), decimals);

      const { request } = await publicClient.simulateContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spender, amountInWei],
        account: walletClient.account.address,
      });

      const hash = await walletClient.writeContract(request);
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    } catch (error) {
      console.error('Error approving USDC:', error);
      throw error;
    }
  }, [walletClient, publicClient, usdcAddress, decimals]);

  const checkAllowance = useCallback(async (owner: string, spender: string) => {
    if (!publicClient) return 0;

    try {
      const allowance = await publicClient.readContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [owner, spender],
      });

      return Number(allowance) / (10 ** decimals);
    } catch (error) {
      console.error('Error checking allowance:', error);
      return 0;
    }
  }, [publicClient, usdcAddress, decimals]);

  const fetchBalance = useCallback(async () => {
    if (!walletClient?.account?.address || !publicClient) return null;
    try {
      const response = await getPortfolios({
        addresses: [walletClient.account.address],
      });

      if ('error' in response) {
        console.error('Error fetching portfolio:', response.error);
        return 0;
      }
      const portfolioData = response as unknown as PortfolioResponse;

      const usdcToken = portfolioData.portfolios[0]?.tokenBalances?.find(
        (token) => token.symbol === 'USDC' && token.chainId === 8453
      );

      if (!usdcToken) return 0;

      return parseFloat(usdcToken.fiatBalance);
    } catch (error) {
      console.error('Error fetching USDC balance:', error);
      return null;
    }
  }, [walletClient?.account?.address, publicClient, usdcAddress, decimals]);

  // Update balance when wallet or public client changes
  useEffect(() => {
    const updateBalance = async () => {
      const newBalance = await fetchBalance();
      setBalance(newBalance);
    };
    updateBalance();
  }, [fetchBalance]);

  const transferUSDC = useCallback(
    async (to: string, amount: number) => {
      if (!walletClient) throw new Error('No wallet client available');
      if (!usdcAddress) throw new Error('USDC token address not configured');
      const value = parseUnits(String(amount), decimals);

      const hash = await (walletClient as any).writeContract({
        address: usdcAddress,
        abi: ERC20_ABI as any,
        functionName: 'placeBet',
        args: [amount],
      });

      try {
        if (publicClient && (publicClient as any).waitForTransactionReceipt) {
          await (publicClient as any).waitForTransactionReceipt({ hash });
          // Refresh balance after successful transfer
          const newBalance = await fetchBalance();
          setBalance(newBalance);
        }
      } catch (e) {
        console.error('Error waiting for transaction:', e);
      }
      return hash as `0x${string}`;
    },
    [walletClient, publicClient, usdcAddress, decimals, fetchBalance]
  );

  const placeBet = useCallback(async (betAmount: string) => {
    try {
      const payment = await pay({
        amount: betAmount,
        to: `${houseAddress}`,
        testnet: false
      });

      const { status } = await getPaymentStatus({
        id: payment.id,
        testnet: false
      });

      if (status === 'completed') {
        // Process the bet
        return { success: true, paymentId: payment.id };
      }
    } catch (error: any) {
      console.error('Payment failed:', error.message);
    }
  }, []);

  return {
    walletBalance: balance,
    walletAddress: address,
    refreshBalance: fetchBalance,
    approveUSDC,
    checkAllowance,
    usdcAddress,
    houseAddress,
    transferUSDC,
    decimals,
    placeBet,
  };
}
