# Aviator Multichain Setup

This document describes the multichain support for Aviator, enabling gameplay on both Base and Celo networks.

## Overview

The Aviator frontend now supports seamless switching between Base (Mainnet) and Celo networks. Users can:
- Switch chains directly from the UI
- See their USDC balance on the current chain
- Place bets and cash out on either network
- View chain-specific transaction links

## Architecture

### Chain Configuration (`lib/chains.ts`)

The `CHAIN_CONFIGS` object is the single source of truth for all chain-specific constants:

```typescript
export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  [base.id]: {
    chain: base,
    usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    gameContractAddress: "0xea7757c9dBDA44961DD900074c15a9dBdEf94931",
    label: "Base",
    explorerUrl: "https://basescan.org",
  },
  [celo.id]: {
    chain: celo,
    usdcAddress: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
    gameContractAddress: "0xF457FE10F74cBD8F02aA62953bb7F7d0d0BDd12a",
    label: "Celo",
    explorerUrl: "https://celoscan.io",
  },
};
```

To add a new chain:
1. Add an entry to `CHAIN_CONFIGS` with the chain ID as key
2. Provide USDC and game contract addresses
3. Update `.env` with the new addresses
4. The rest of the app automatically picks up the new chain

### Wagmi Configuration (`app/rootProvider.tsx`)

- Dynamically builds transports for all supported chains
- Configures connectors: MetaMask, Coinbase Wallet, WalletConnect
- SSR-safe: WalletConnect only initialized client-side

### Hooks

#### `useChainInfo()` - Chain State Management
Returns current chain information and balances:
```typescript
const { chainId, chainLabel, usdcBalance, explorerUrl } = useChainInfo();
```

#### `useWallet()` - Wallet Connection
Handles wallet connection and balance queries:
```typescript
const { address, balance, isConnected, connect, disconnect } = useWallet();
```

#### `useUSDC()` - USDC Operations
Manages USDC approvals and transfers on the current chain:
```typescript
const { walletBalance, approveUSDC, checkAllowance } = useUSDC();
```

#### `useGame()` - Game Logic
Handles bet placement and cashout, automatically using the current chain's contract:
```typescript
const { placeBet, cashOut, roundData } = useGame();
```

## Components

### ChainSwitcher
Dropdown component for switching between Base and Celo:
```tsx
<ChainSwitcher />
```

Features:
- Shows current chain with status indicator
- Dropdown with all available chains
- Disabled state during chain switch
- Integrated in nav.tsx

### ChainWarning
Alerts users if they're on an unsupported chain:
```tsx
<ChainWarning />
```

Only displays when user is on a chain not in `CHAIN_CONFIGS`.

### Enhanced Navigation
- Displays current chain via ChainSwitcher
- Shows USDC balance on current chain
- Works on both desktop and mobile

### Enhanced BetControls
- Shows which chain the game is being played on
- Chain-specific transaction explorer links
- Displays balance for current chain

## Environment Variables

```env
# Base (chain ID 8453)
NEXT_PUBLIC_BASE_GAME_CONTRACT_ADDRESS="0xea7757c9dBDA44961DD900074c15a9dBdEf94931"
NEXT_PUBLIC_BASE_USDC_ADDRESS="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"

# Celo (chain ID 42220)
NEXT_PUBLIC_CELO_GAME_CONTRACT_ADDRESS="0xF457FE10F74cBD8F02aA62953bb7F7d0d0BDd12a"
NEXT_PUBLIC_CELO_USDC_ADDRESS="0xcebA9300f2b948710d2653dD7B07f33A8B32118C"
```

## User Flow

1. **Connect Wallet**: User connects via MetaMask, Coinbase Wallet, or WalletConnect
2. **Select Chain**: User can switch between Base and Celo using ChainSwitcher
3. **Check Balance**: USDC balance displayed for current chain
4. **Place Bet**: Bet is placed on the current chain's game contract
5. **View Transaction**: Transaction link uses chain-specific explorer

## Adding a New Chain

To add support for a new chain (e.g., Arbitrum):

1. **Update `lib/chains.ts`**:
```typescript
import { arbitrum } from "wagmi/chains";

export const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  // ... existing chains
  [arbitrum.id]: {
    chain: arbitrum,
    usdcAddress: "0x...",
    gameContractAddress: "0x...",
    label: "Arbitrum",
    explorerUrl: "https://arbiscan.io",
  },
};
```

2. **Update `.env`**:
```env
NEXT_PUBLIC_ARBITRUM_GAME_CONTRACT_ADDRESS="0x..."
NEXT_PUBLIC_ARBITRUM_USDC_ADDRESS="0x..."
```

3. **Deploy contracts** on the new chain
4. **Test** chain switching and bet placement

## Backward Compatibility

All existing functionality is preserved:
- Single-chain users see no breaking changes
- Chain switching is optional
- Default chain is Base if unknown
- All existing components work unchanged

## Testing

### Manual Testing Checklist
- [ ] Connect wallet on Base
- [ ] Place bet on Base
- [ ] Switch to Celo
- [ ] Place bet on Celo
- [ ] Verify balances update per chain
- [ ] Verify transaction links use correct explorer
- [ ] Test on mobile (chain switcher in menu)
- [ ] Test unsupported chain warning
- [ ] Test wallet disconnect/reconnect

### Chain-Specific Testing
- [ ] Base: Verify USDC address and game contract
- [ ] Celo: Verify USDC address and game contract
- [ ] Test gas prices and transaction speeds
- [ ] Verify leaderboard works across chains

## Troubleshooting

### Chain not switching
- Ensure wallet supports the target chain
- Check that chain is in `CHAIN_CONFIGS`
- Verify environment variables are set

### Balance not updating
- Refresh page
- Disconnect and reconnect wallet
- Check USDC contract address for chain

### Transaction fails
- Verify sufficient USDC balance
- Check game contract is deployed on chain
- Verify USDC approval was successful

## Performance Considerations

- Chain switching is instant (no page reload)
- Balances update automatically via wagmi hooks
- Transaction links use chain-specific explorers
- No additional API calls for chain switching

## Security

- All contract addresses are environment-variable driven
- No hardcoded addresses in components
- Chain validation prevents unsupported chains
- USDC approval uses maxUint256 for convenience
