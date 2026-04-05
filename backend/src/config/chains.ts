/**
 * Backend chain registry — single source of truth for all supported chains.
 * Each entry maps a chain ID to its RPC URL and contract address,
 * resolved from environment variables.
 */

export interface BackendChainConfig {
    chainId: number;
    label: string;
    rpcUrl: string;
    contractAddress: string;
    usdcAddress: string;
    explorerUrl: string;
}

const CHAIN_REGISTRY: Record<string, BackendChainConfig> = {
    base: {
        chainId: 8453,
        label: "Base",
        rpcUrl: process.env.BASE_RPC_URL || "https://mainnet.base.org",
        contractAddress: process.env.BASE_AVIATOR_CONTRACT_ADDRESS || "",
        usdcAddress:
            process.env.BASE_USDC_ADDRESS ||
            "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        explorerUrl: "https://basescan.org",
    },
    celo: {
        chainId: 42220,
        label: "Celo",
        rpcUrl: process.env.CELO_RPC_URL || "https://forno.celo.org",
        contractAddress: process.env.CELO_AVIATOR_CONTRACT_ADDRESS || "",
        usdcAddress:
            process.env.CELO_USDC_ADDRESS ||
            "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
        explorerUrl: "https://celoscan.io",
    },
};

/**
 * Returns the chain config for the active chain, determined by ACTIVE_CHAIN env var.
 * Defaults to "base" to preserve existing behaviour.
 */
export function getActiveChainConfig(): BackendChainConfig {
    const key = (process.env.ACTIVE_CHAIN || "base").toLowerCase();
    const config = CHAIN_REGISTRY[key];
    if (!config) {
        throw new Error(
            `Unknown ACTIVE_CHAIN="${key}". Supported values: ${Object.keys(CHAIN_REGISTRY).join(", ")}`
        );
    }
    if (!config.contractAddress) {
        throw new Error(
            `Contract address not set for chain "${key}". ` +
            `Set ${key.toUpperCase()}_AVIATOR_CONTRACT_ADDRESS in your .env`
        );
    }
    return config;
}

export { CHAIN_REGISTRY };
