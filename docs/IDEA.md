# DripStocks - Detailed Spec

## Problem
Stocks sit idle in brokerage. You can't pay rent in AAPL, stream salary in NVDA, or subscribe to a creator in META per second. TradFi: 2 paychecks/month, market hours, broker lock-in.

## Solution
DripStocks wraps Coinbase B20 tokenized stocks with streaming. Any wallet can stream any `*c` stock to any address per second.

### Core Flows

**1. Create Stream (Employer / Fan)**
Input: token (AAPLc/NVDAc/METAc/GOOGLc), amount, duration, recipient (ENS/Base name/address/email claim link)
Action: `approve B20 -> Sablier createLockupLinear` (or DripVault wrapper for claim links)
Result: Stream NFT minted, recipient notified

**2. Dashboard (Recipient)**
Live balance: `streamed = total * elapsed/duration` ticking per second (use Sablier subgraph or client interval)
Actions: Withdraw (claim vested), Cancel (employer), Transfer stream NFT

**3. Streaming Collateral (Wow Feature)**
Show withdrawable AAPLc balance as Aave collateral health factor. "Borrow USDC against your streaming salary without waiting for cliff."

### Contracts
- `contracts/src/DripVault.sol` - Minimal wrapper over Sablier V2 for:
  - Email/claim link streams (recipient not known upfront) - stores streamId -> claimHash
  - Batch create (payroll for 10 employees in one tx)
- Tests in Foundry, deploy to Base Sepolia -> Base Mainnet

### Frontend (app/)
- Next.js 14 + OnchainKit (wallet, Base Pay)
- Wagmi/Viem for B20 reads, Sablier SDK for streams
- Pages: `/` (hero + create), `/stream/[id]` (dashboard), `/claim/[hash]`
- Mini App manifest for Base App discovery
- Aerodrome widget: "Need AAPLc? Swap USDC -> AAPLc"
- Aave widget: "Deposit streamed AAPLc -> Borrow USDC"

### B20 Integration
- Addresses: from docs.base.org/base-chain/asset-issuance/tokenized-stocks-on-base (fetch on build)
- On Sepolia mock with USDC for testing, switch to Mainnet B20 for demo
- Handle multiplier: no balance changes on dividends, so streaming math stays valid

### Loom Script (90 sec)
0:00 "Stocks sit dead. On Base they stream." Show brokerage vs Base
0:15 Create stream: 1 NVDAc / 30 days to alice.base.eth
0:35 Alice dashboard: balance ticks, withdraw 0.02, show Aave collateral update
0:55 "And subscriptions: 0.05 METAc/month to my favorite creator, streamed."
1:10 Tag @buildonbase, show Base Mini App QR

### Differentiation
- vs AI Baskets: we don't predict, we pay. More universal.
- vs Aave Vaults: we use stocks as money, not just collateral.
- Moat: Claim links + batch payroll + live ticking UI - polish competitors won't have time for.

### Future (post-quest)
- Streaming LP: stream goes directly into Aerodrome LP
- Will/Inheritance mode: stream that unlocks at timestamp (heir)
- No-loss pot: undrawn stream yield funds prize

### Risks
- Sablier may not support B20 multiplier? - test early, fallback to custom linear vault (simple)
- Mainnet B20 faucets limited - need funded wallet for demo

