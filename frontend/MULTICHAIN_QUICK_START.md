# Multichain Quick Start Guide

## What Changed?

The Aviator frontend now supports Base and Celo networks with seamless chain switching. All existing functionality is preserved.

## New Components

### 1. ChainSwitcher (`components/ChainSwitcher.tsx`)
Dropdown to switch between chains. Automatically integrated in the navigation bar.

```tsx
import ChainSwitcher from "@/components/ChainSwitcher";

// Already included in nav.tsx
<ChainSwitcher />
```

### 2. ChainWarning (`components/ChainWarning.tsx`)
Alerts users if they're on an unsupported chain.

```tsx
import ChainWarning from "@/components/ChainWarning";

// Already included in gameScreen.tsx
<ChainWarning />
```

## New Hooks

### useChainInfo()
Get current chain information and balances:

```typescript
import useChainInfo from "@/hooks/useChainInfo";

const { 
  chainId,           // Current chain ID
  chainLabel,        // "Base" or "Celo"
  usdcBalance,       // USDC balance on current chain
  explorerUrl,       // Block explorer URL
  allChains,         // All available chains
} = useChainInfo();
```

## How It Works

1. **Chain Configuration** is in `lib/chains.ts`
   - Single source of truth for all chain-specific constants
   - Add new chains here

2. **Automatic Chain Detection**
   - Wagmi automatically detects user's connected chain
   - All hooks use `useChainId()` to get current chain
   - Contract addresses resolved per-chain

3. **Seamless Switching**
   - User switches chain in their wallet
   - Frontend automatically updates
   - No page reload needed

## Key Files

| File | Purpose |
|------|---------|
| `lib/chains.ts` | Chain configuration (USDC, game contract addresses) |
| `app/rootProvider.tsx` | Wagmi setup with all chains |
| `hooks/useChainInfo.ts` | Get current chain info and balances |
| `components/ChainSwitcher.tsx` | UI for switching chains |
| `components/ChainWarning.tsx` | Warning for unsupported chains |
| `components/nav.tsx` | Updated with chain switcher and balance |
| `components/BetControls.tsx` | Updated with chain-specific explorer links |

## Environment Variables

```env
# Base
NEXT_PUBLIC_BASE_GAME_CONTRACT_ADDRESS="0x..."
NEXT_PUBLIC_BASE_USDC_ADDRESS="0x..."

# Celo
NEXT_PUBLIC_CELO_GAME_CONTRACT_ADDRESS="0x..."
NEXT_PUBLIC_CELO_USDC_ADDRESS="0x..."
```

## Adding a New Chain

1. Import chain from wagmi:
```typescript
import { arbitrum } from "wagmi/chains";
```

2. Add to `CHAIN_CONFIGS` in `lib/chains.ts`:
```typescript
[arbitrum.id]: {
  chain: arbitrum,
  usdcAddress: "0x...",
  gameContractAddress: "0x...",
  label: "Arbitrum",
  explorerUrl: "https://arbiscan.io",
}
```

3. Add environment variables:
```env
NEXT_PUBLIC_ARBITRUM_GAME_CONTRACT_ADDRESS="0x..."
NEXT_PUBLIC_ARBITRUM_USDC_ADDRESS="0x..."
```

That's it! The rest of the app automatically picks up the new chain.

## Testing

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev

# Test chain switching:
# 1. Connect wallet
# 2. Click chain switcher in nav
# 3. Select different chain
# 4. Verify balance updates
# 5. Place a bet
# 6. Verify transaction link uses correct explorer
```

## Backward Compatibility

✅ All existing functionality preserved
✅ Single-chain users see no breaking changes
✅ Chain switching is optional
✅ Default chain is Base if unknown

## Common Issues

**Q: Balance not updating after chain switch?**
A: Refresh the page or disconnect/reconnect wallet.

**Q: Chain switcher not showing?**
A: Ensure you're on a supported chain (Base or Celo).

**Q: Transaction link broken?**
A: Verify `explorerUrl` in `CHAIN_CONFIGS` for your chain.

**Q: Can't place bet on Celo?**
A: Ensure game contract is deployed on Celo and address is correct in `.env`.

## Performance

- Chain switching: Instant (no page reload)
- Balance updates: Real-time via wagmi
- Transaction links: Chain-specific explorers
- No additional API calls for chain switching

## Support

For issues or questions:
1. Check `MULTICHAIN_SETUP.md` for detailed documentation
2. Verify environment variables are set correctly
3. Ensure contracts are deployed on both chains
4. Check browser console for errors
