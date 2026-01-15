import { useCallback, useEffect, useState } from 'react';
import { useWalletClient, usePublicClient } from 'wagmi';
import { parseUnits } from 'viem';

const ERC20_ABI = [
  { name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
];

export default function useUSDC() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [balance, setBalance] = useState<number | null>(null);
  const usdcAddress = (process.env.NEXT_PUBLIC_USDC_ADDRESS || '') as `0x${string}`;
  const houseAddress = process.env.NEXT_PUBLIC_HOUSE_ADDRESS as `0x${string}` | undefined;
  const decimals = 6; // USDC typically uses 6 decimals

  const fetchBalance = useCallback(async () => {
    if (!walletClient?.account?.address || !publicClient) return null;
    try {
      const balance = await (publicClient as any).readContract({
        address: usdcAddress,
        abi: ERC20_ABI as any,
        functionName: 'balanceOf',
        args: [walletClient.account.address as `0x${string}`],
      });
      return Number(balance) / (10 ** decimals);
    } catch (error) {
      console.error('Error fetching balance:', error);
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
        functionName: 'transfer',
        args: [to as `0x${string}`, value],
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

  const walletAddress = walletClient?.account?.address;

  return {
    usdcAddress,
    houseAddress,
    transferUSDC,
    walletBalance: balance,
    refreshBalance: fetchBalance,
    walletAddress,
  };
}
