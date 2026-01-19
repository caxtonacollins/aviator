# 🎮 Aviator Game - Full Stack

A real-time crash game built on Base blockchain with Farcaster integration, USDC payments, and gasless transactions via Paymaster.

## ✨ Key Features

### Core Game
- **Real-time crash game** with exponential multiplier growth
- **Live player updates** via WebSocket  
- **Provably fair** - on-chain crash verification with server seed hashing
- **Instant payouts** in USDC
- **Countdown timer** - Visible betting phase countdown

### Blockchain & Payments
- ✅ **USDC payments** - Players bet in USDC tokens (Base network)
- ✅ **Gasless transactions** - Paymaster sponsors transaction fees
- ✅ **ERC-4337 compatible** - Account abstraction ready
- ✅ **Secure betting** - Smart contract enforces all rules

### User Experience
- ✅ **Farcaster MiniApp** - Frame SDK integrated
- ✅ **Base Mini App Kit** - Native Base integration
- ✅ **Mobile responsive** - Works everywhere
- ✅ **Real-time feedback** - WebSocket updates

## 🏗️ Architecture

```
aviator/
├── frontend/          # Next.js 15 + React 19
│   ├── app/           # App router (Farcaster entry)
│   ├── components/    # Game UI components
│   ├── context/       # GameContext state
│   ├── hooks/         # useGame, usePaymaster, useUSDC
│   └── types/         # TypeScript definitions
├── backend/           # Express + Socket.IO + TypeORM
│   ├── src/
│   │   ├── routes/    # REST API endpoints
│   │   ├── services/  # GameEngine, Services
│   │   ├── entities/  # Database entities
│   │   ├── db/        # Migrations
│   │   └── config/    # Configuration
├── contracts/         # Solidity + Foundry
│   ├── src/
│   │   ├── AviatorGameUSDC.sol # Main contract (USDC + ERC-4337)
│   │   └── Aviator.sol         # Legacy (ETH-based)
│   ├── test/          # Contract tests
│   └── script/        # Deployment scripts
└── .env.example       # Configuration template
```

## 🚀 Quick Start

### Prerequisites
- **Node.js** ≥ 18.0.0
- **pnpm** ≥ 8.0.0
- **PostgreSQL** (backend)
- **Foundry** (contracts)

### Installation

```bash
# Clone and install
git clone <repo>
cd aviator
pnpm install:all

# Setup environment
cp .env.example .env.local
cp .env.example backend/.env
```

### Configuration

**Frontend (`.env.local`):**
```env
NEXT_PUBLIC_BASE_CHAIN_ID=0x2105
NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
NEXT_PUBLIC_HOUSE_ADDRESS=0x<contract>
NEXT_PUBLIC_PAYMASTER_PROXY_URL=http://localhost:3001/paymaster
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

**Backend (`backend/.env`):**
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/aviator
BASE_RPC_URL=https://mainnet.base.org
USDC_TOKEN_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
SERVER_OPERATOR_ADDRESS=0x<your-address>
```

### Development

```bash
# Run both frontend and backend
pnpm dev

# Or separately
pnpm frontend:dev  # http://localhost:3000
pnpm backend:dev   # http://localhost:3001

# Database setup
cd backend
pnpm db:sync && pnpm db:migrate
```

## 🔗 Blockchain

### Smart Contracts

**Recommended: AviatorGameUSDC.sol**
- USDC token support
- ERC-4337 ready
- Paymaster compatible

**Deploy:**
```bash
cd contracts
forge script script/Aviator.s.sol --rpc-url $BASE_RPC --broadcast
```

### Paymaster (Gasless)

Setup via [Coinbase Developer Platform](https://www.coinbase.com/developer-platform):
1. Create account and get Paymaster URL
2. Add contract to allowlist
3. Set `NEXT_PUBLIC_PAYMASTER_PROXY_URL`

Players see "Gas Sponsored ✓" with no fees!

## 🎯 Game Flow

```
BETTING (10s) → FLYING (variable) → CRASHED → SETTLE
   ↓              ↓                  ↓
Place bets    Cash out          Record results
Countdown     Pay out USDC       Next round
```

## 📱 Farcaster

- ✅ MiniApp SDK initialized
- ✅ Frame responsive design
- 🔜 Cast-to-play actions
- 🔜 Leaderboard frame

## 📚 Full Docs

- See `.env.example` for all configuration
- Smart contract code in `contracts/src/`
- API endpoints documented in backend
- Component usage in frontend

## 📄 License

MIT

---