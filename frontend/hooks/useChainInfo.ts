import { useChainId, useBalance } from "wagmi";
import { useAccount } from "wagmi";
import { getChainConfig, CHAIN_CONFIGS } from "@/lib/chains";
import { useMemo } from "react";

/**
 * Hook to get current chain information and balances
 * Provides chain config, current chain label, and balance info
 */
export function useChainInfo() {
    const chainId = useChainId();
    const { address } = useAccount();
    const chainConfig = getChainConfig(chainId);

    // Get USDC balance on current chain
    const usdcBalance = useBalance({
        address,
        token: chainConfig.usdcAddress,
    });

    // Get native balance on current chain
    const nativeBalance = useBalance({
        address,
    });

    const formattedUsdcBalance = useMemo(() => {
        const balance = usdcBalance?.data?.formatted;
        return balance ? parseFloat(balance) : 0;
    }, [usdcBalance?.data?.formatted]);

    const formattedNativeBalance = useMemo(() => {
        const balance = nativeBalance?.data?.formatted;
        return balance ? parseFloat(balance) : 0;
    }, [nativeBalance?.data?.formatted]);

    return {
        chainId,
        chainConfig,
        chainLabel: chainConfig.label,
        explorerUrl: chainConfig.explorerUrl,
        usdcBalance: formattedUsdcBalance,
        nativeBalance: formattedNativeBalance,
        isLoadingBalance: usdcBalance.isLoading || nativeBalance.isLoading,
        allChains: Object.values(CHAIN_CONFIGS),
    };
}

export default useChainInfo;
