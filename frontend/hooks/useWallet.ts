import { useMemo } from "react";
import { useAccount, useConnect, useDisconnect, useBalance, useChainId } from "wagmi";
import { getChainConfig } from "@/lib/chains";

/**
 * Wallet hook backed by wagmi. OnchainKitProvider in `app/rootProvider.tsx` provides connectors and context.
 * Returns both ETH balance and USDC balance, resolved from the active chain.
 */
export function useWallet() {
  const { address, isConnected } = useAccount();
  const { connectors, connectAsync } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const chainId = useChainId();

  const ethBalance = useBalance({ address });

  const { usdcAddress } = getChainConfig(chainId);
  const usdcBalance = useBalance({
    address,
    token: usdcAddress,
  });

  const balance = useMemo(() => {
    const usdc = usdcBalance?.data?.formatted;
    if (usdc) return parseFloat(usdc);
    const eth = ethBalance?.data?.formatted;
    if (eth) return parseFloat(eth);
    return 0;
  }, [ethBalance?.data?.formatted, usdcBalance?.data?.formatted]);

  async function connect() {
    if (connectors && connectors.length) {
      try {
        await connectAsync({ connector: connectors[0] });
      } catch (e) {
        console.error("Connect failed", e);
      }
    }
  }

  async function disconnect() {
    try {
      await disconnectAsync();
    } catch (e) {
      console.error("Disconnect failed", e);
    }
  }

  return {
    address: address ?? null,
    balance,
    ethBalance: ethBalance?.data ?? null,
    usdcBalance: usdcBalance?.data ?? null,
    isConnected,
    connect,
    disconnect,
  };
}

export default useWallet;
