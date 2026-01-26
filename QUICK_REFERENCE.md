# Quick Reference Guide

## 🚀 Development Quick Start

### Initial Setup (5 minutes)
```bash
/aviator
pnpm install:all
cp .env.example .env.local
cp .env.example backend/.env
```

### Start Development (1 command)
```bash
pnpm dev
```

This starts both frontend (localhost:3000) and backend (localhost:3001).

### Database Setup
```bash
cd backend
pnpm db:sync    # Create schema
pnpm db:migrate # Run migrations
pnpm db:seed    # Load test data
```

---

## 🔑 Key Environment Variables

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_BASE_CHAIN_ID=0x2105
NEXT_PUBLIC_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=<your-contract>
NEXT_PUBLIC_PAYMASTER_PROXY_URL=http://localhost:3001/paymaster
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

### Backend (`backend/.env`)
```env
DATABASE_URL=postgresql://user:pass@localhost/aviator
BASE_RPC_URL=https://mainnet.base.org
USDC_TOKEN_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
SERVER_OPERATOR_ADDRESS=<your-address>
```

---

## 📂 Project Structure

```
aviator/
├── frontend/              # Next.js 15 app
│   ├── app/             # Pages (page.tsx)
│   ├── components/      # React components
│   │   ├── BetControls.tsx     (✅ Fixed & Enhanced)
│   │   ├── RoundInfo.tsx       (✅ Added countdown)
│   │   ├── GameBoard.tsx
│   │   ├── HistoryBar.tsx
│   │   └── StatsPanel.tsx
│   ├── context/         # GameContext (✅ Typed)
│   ├── hooks/           # Custom hooks
│   │   ├── useGame.ts              (Core game logic)
│   │   ├── useUSDC.ts              (Token operations)
│   │   ├── usePaymaster.ts         (✅ NEW - Gasless tx)
│   │   ├── useFarcasterAuth.ts     (✅ NEW - Auth)
│   │   └── useBetValidation.ts
│   ├── lib/
│   │   ├── api.ts           (REST calls)
│   │   └── gameUtils.ts     (✅ NEW - Utilities)
│   └── types/           # TypeScript types
│
├── backend/               # Express.js server
│   ├── src/
│   │   ├── index.ts           (Server entry)
│   │   ├── routes/            (REST API)
│   │   ├── services/          (GameEngine)
│   │   ├── entities/          (DB models)
│   │   ├── db/                (Migrations)
│   │   ├── config/database.ts
│   │   ├── middleware/
│   │   └── utils/
│   ├── vitest.config.ts
│   └── package.json
│
├── contracts/             # Solidity smart contracts
│   ├── src/
│   │   ├── Aviator.sol          (ETH version - legacy)
│   │   └── AviatorGameUSDC.sol   (✅ NEW - USDC + ERC-4337)
│   ├── test/
│   ├── script/
│   ├── foundry.toml
│   └── remappings.txt
│
├── .env.example           (✅ CREATED)
├── README.md              (✅ UPDATED)
├── DEPLOYMENT.md          (✅ CREATED)
└── IMPLEMENTATION_SUMMARY.md (✅ CREATED)
```

---

## 🎮 Game Flow

```
Player connects wallet
        ↓
Player sees current round (BETTING phase)
        ↓
Countdown timer appears (10 seconds)
        ↓
Player enters USDC bet amount
        ↓
Player clicks "Place Bet"
        ↓
Paymaster sponsors gas ✓
USDC transferred to contract
        ↓
Server starts FLYING phase
Multiplier increases
        ↓
Player can cash out anytime
        ↓
Player wins (payout) or loses (bet taken)
        ↓
New round starts
```

---

## 🔧 Common Commands

### Frontend
```bash
pnpm frontend:dev      # Dev server
pnpm frontend:build    # Production build
pnpm frontend:lint     # Check code style
pnpm frontend:format   # Auto-format code
```

### Backend
```bash
pnpm backend:dev       # Dev server with auto-reload
pnpm backend:build     # TypeScript compilation
pnpm backend:start     # Run compiled code
pnpm backend:lint      # Check code style

# Database
pnpm db:sync           # Create schema
pnpm db:migrate        # Run migrations
pnpm db:seed           # Load test data
```

### Contracts
```bash
cd contracts
forge test             # Run all tests
forge test -v          # Verbose output
forge build            # Compile
forge script script/Aviator.s.sol --broadcast  # Deploy
```

---

## 📡 API Endpoints (Quick Reference)

### Game State
```
GET /api/rounds/current           # Active round
GET /api/rounds/:roundId          # Historical round
POST /api/rounds/:roundId/bet     # Place bet
POST /api/rounds/:roundId/cashout # Cash out
```

### Stats & History
```
GET /api/leaderboard              # Top players
GET /api/leaderboard/:address     # Player stats
GET /api/history                  # Game history
GET /api/history/:roundId         # Round details
```

### Special
```
POST /api/paymaster               # Gasless tx proxy
GET /health                       # Server status
```

---

## 🔗 Smart Contract Functions

### Player Functions
```solidity
placeBet(uint256 amount)          // Place USDC bet
cashOut(uint256 multiplier)       // Claim winnings
getMyBet()                        // Check current bet
getPlayerStats(address player)    // Player history
```

### Server Functions (onlyServerOperator)
```solidity
startFlying(bytes32 seedHash)           // Begin flying phase
crashRound(uint256 crash, string seed)  // End round
```

### Admin Functions (onlyOwner)
```solidity
fundHouse(uint256 amount)         // Add USDC to house
withdrawHouseProfits(uint256)     // Withdraw profits
setServerOperator(address)        // Change operator
pause() / unpause()               // Emergency pause
```

---

## 🐛 Debugging Tips

### Frontend Issues
```bash
# Check console for errors
# Check if NEXT_PUBLIC_* vars are set
# Verify Paymaster URL is accessible
# Check WebSocket connection in Network tab
```

### Backend Issues
```bash
# Check logs
tail -f logs/app.log

# Test health endpoint
curl http://localhost:3001/health

# Check database connection
psql $DATABASE_URL

# View WebSocket connections
# (Should show connected clients)
```

### Contract Issues
```bash
# Test locally
forge test --match placeBet -v

# Check deployment
cast call <address> "currentRoundId()" --rpc-url $RPC

# Verify on-chain
basescan.org/address/<address>
```

---

## ⚙️ Configuration Checklist

### Development
- [ ] Node.js installed (≥18)
- [ ] pnpm installed (≥8)
- [ ] PostgreSQL running
- [ ] `.env.local` configured
- [ ] `backend/.env` configured
- [ ] `pnpm dev` works
- [ ] Frontend loads on localhost:3000
- [ ] Backend runs on localhost:3001

### Staging/Production
- [ ] Database hosted and accessible
- [ ] Contracts deployed to Base
- [ ] Paymaster URL obtained
- [ ] Backend hosted and running
- [ ] Frontend deployed to Vercel
- [ ] Domain + SSL configured
- [ ] WebSocket WSS working
- [ ] Environment variables set
- [ ] Health checks passing

---

## 📱 Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| Real-time game | ✅ Complete | WebSocket + REST |
| USDC payments | ✅ Complete | ERC20 integration |
| Countdown timer | ✅ Complete | Visual 10s counter |
| Gasless tx | ✅ Ready | Requires Paymaster setup |
| Smart contract | ✅ Ready | Deploy to Base |
| Farcaster | ✅ Ready | MiniApp + Auth Kit |
| Type safety | ✅ Complete | Full TypeScript |
| Error handling | ✅ Complete | User-friendly msgs |

---

## 🚨 Critical Files

These files should NOT be committed:
- `.env` / `.env.local` (contains secrets)
- `node_modules/` (generated)
- `.next/` (generated)
- `dist/` (compiled)
- Private keys (anywhere!)

Always in `.gitignore`:
```
.env
.env.local
.env.*.local
node_modules/
.next/
dist/
```

---

## 📞 Getting Help

### Documentation
- Smart contract comments in `contracts/src/AviatorGameUSDC.sol`
- Deployment guide: [DEPLOYMENT.md](../DEPLOYMENT.md)
- Full implementation: [IMPLEMENTATION_SUMMARY.md](../IMPLEMENTATION_SUMMARY.md)
- API docs: [README.md](../README.md#api-reference)

### Common Issues

**Paymaster not working:**
→ Check allowlist in Coinbase Developer Platform
→ Verify contract address is correct
→ Test with supported wallet

**WebSocket disconnects:**
→ Check backend is running
→ Verify firewall allows WSS
→ Check proxy headers (nginx/caddy config)

**Database connection fails:**
→ Verify DATABASE_URL is correct
→ Check network access to database host
→ Test with psql command

**Contract deployment fails:**
→ Check deployer has Base ETH
→ Verify RPC URL works
→ Check contract syntax with `forge build`

---

## 🎯 Next Immediate Steps

1. **Run locally to test:**
   ```bash
   pnpm dev
   ```

2. **Deploy contracts to Sepolia testnet:**
   ```bash
   cd contracts
   forge script script/Aviator.s.sol --rpc-url $SEPOLIA_RPC --broadcast
   ```

3. **Setup Paymaster on Coinbase Developer Platform**

4. **Test full betting flow:**
   - Place bet → Check contract
   - Cash out → Verify USDC received

5. **Then deploy to Base mainnet:**
   ```bash
   forge script script/Aviator.s.sol --rpc-url $BASE_RPC --broadcast
   ```

---

**Last Updated:** January 2026  
**Quick Reference Version:** 1.0
