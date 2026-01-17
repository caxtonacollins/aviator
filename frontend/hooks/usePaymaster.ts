import { useCallback, useEffect, useState } from "react";

/**
 * Hook for interacting with Base Paymaster for sponsored transactions
 * Integrates with Base Account SDK for ERC-4337 Account Abstraction
 */
export function usePaymaster() {
  const [provider, setProvider] = useState<any>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const paymasterUrl = process.env.NEXT_PUBLIC_PAYMASTER_PROXY_URL;
  const baseChainId = process.env.NEXT_PUBLIC_BASE_CHAIN_ID || "0x2105"; // Base Mainnet

  // Initialize Base Account SDK
  useEffect(() => {
    const initializeSDK = async () => {
      try {
        // @ts-ignore
        if (typeof window !== "undefined" && window.baseAccountSDK) {
          const sdk = window.baseAccountSDK;
          const baseProvider = sdk?.getProvider?.();
          setProvider(baseProvider);

          // Check paymaster support
          if (baseProvider) {
            checkPaymasterSupport(baseProvider);
          }
        }
      } catch (error) {
        console.warn("Base Account SDK not initialized:", error);
      }
    };

    initializeSDK();
  }, []);

  // Check if wallet supports paymaster service
  const checkPaymasterSupport = useCallback(
    async (provider: any) => {
      try {
        if (!userAddress || !provider) return;

        const capabilities = await provider.request({
          method: "wallet_getCapabilities",
          params: [userAddress],
        });

        const baseCapabilities = capabilities?.[baseChainId];
        const hasPaymaster = baseCapabilities?.paymasterService?.supported;
        setIsSupported(hasPaymaster || false);
      } catch (error) {
        console.warn("Failed to check paymaster support:", error);
        setIsSupported(false);
      }
    },
    [userAddress, baseChainId]
  );

  // Send a single sponsored transaction
  const sendSponsoredTransaction = useCallback(
    async (to: string, data: string, value: string = "0") => {
      if (!provider || !userAddress || !paymasterUrl) {
        throw new Error("Paymaster not configured");
      }

      if (!isSupported) {
        throw new Error("Wallet does not support paymaster service");
      }

      try {
        const calls = [
          {
            to,
            value,
            data,
          },
        ];

        const result = await provider.request({
          method: "wallet_sendCalls",
          params: [
            {
              version: "1.0",
              chainId: baseChainId,
              from: userAddress,
              calls,
              capabilities: {
                paymasterService: {
                  url: paymasterUrl,
                },
              },
            },
          ],
        });

        return result;
      } catch (error) {
        console.error("Sponsored transaction failed:", error);
        throw error;
      }
    },
    [provider, userAddress, paymasterUrl, isSupported, baseChainId]
  );

  // Send multiple sponsored transactions (batch)
  const sendBatchSponsoredTransactions = useCallback(
    async (calls: Array<{ to: string; data: string; value?: string }>) => {
      if (!provider || !userAddress || !paymasterUrl) {
        throw new Error("Paymaster not configured");
      }

      if (!isSupported) {
        throw new Error("Wallet does not support paymaster service");
      }

      try {
        const formattedCalls = calls.map((call) => ({
          to: call.to,
          value: call.value || "0",
          data: call.data,
        }));

        const result = await provider.request({
          method: "wallet_sendCalls",
          params: [
            {
              version: "1.0",
              chainId: baseChainId,
              from: userAddress,
              calls: formattedCalls,
              capabilities: {
                paymasterService: {
                  url: paymasterUrl,
                },
              },
            },
          ],
        });

        return result;
      } catch (error) {
        console.error("Batch sponsored transaction failed:", error);
        throw error;
      }
    },
    [provider, userAddress, paymasterUrl, isSupported, baseChainId]
  );

  // Connect wallet using Base Account
  const connectWallet = useCallback(async () => {
    if (!provider) {
      throw new Error("Base Account SDK not initialized");
    }

    try {
      const nonce = generateNonce();
      const { accounts } = await provider.request({
        method: "wallet_connect",
        params: [
          {
            version: "1",
            capabilities: {
              signInWithEthereum: {
                nonce,
                chainId: baseChainId,
              },
            },
          },
        ],
      });

      const address = accounts?.[0]?.address;
      if (address) {
        setUserAddress(address);
        checkPaymasterSupport(provider);
        return address;
      }

      throw new Error("No address returned from wallet");
    } catch (error) {
      console.error("Wallet connection failed:", error);
      throw error;
    }
  }, [provider, baseChainId, checkPaymasterSupport]);

  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    try {
      setUserAddress(null);
      setIsSupported(false);
    } catch (error) {
      console.error("Wallet disconnection failed:", error);
    }
  }, []);

  return {
    provider,
    userAddress,
    isSupported,
    isPaymasterConfigured: !!paymasterUrl,
    sendSponsoredTransaction,
    sendBatchSponsoredTransactions,
    connectWallet,
    disconnectWallet,
  };
}

/**
 * Generate a random nonce for authentication
 */
function generateNonce(): string {
  return crypto.getRandomValues(new Uint8Array(16)).toString();
}

export default usePaymaster;
