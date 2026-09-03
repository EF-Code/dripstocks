# DripStocks — Stocks as Streaming Money

> **Tagline:** Stream any Coinbase Tokenized Stock per second. Built on Base.
> **Contest:** Base Builder Quest - Tokenized Stocks | $5,000 pool ($2k winner) | Ends Sep 9, 2026 11:59pm EST
> **Status:** Scaffold

### One-liner
In TradFi you get paid twice a month in USD. On DripStocks you get paid every second in `AAPLc / NVDAc / METAc / GOOGLc` — streaming B20 tokenized stocks on Base.

### Why This Wins
- **Novel:** Everyone else builds "trade NVDAc". We make NVDAc *money* — impossible in TradFi, trivial on Base. Instant 10-sec wow.
- **Aligns with brief:** Uses B20 (ERC20 extension) 24/7, composable with Aave/Aerodrome/Chainlink, helps people *use* stocks (payroll, creator subs, rent)
- **Low collision:** <5% will think beyond trading UI. Forking Aave takes 1hr, streaming takes insight.
- **Distribution:** Shipped as Base Mini App + Farcaster Frame

### Demo (45s Loom)
1. Employer creates stream: 2 AAPLc → Alice over 30 days
2. Alice sees balance tick live `+0.0000007 AAPLc/sec` → Withdraw anytime → Use streaming balance as collateral
3. Second use-case: Fan subscribes 0.05 METAc/month to creator (streaming subscription)

### Tech Stack
- **Chain:** Base Mainnet
- **Tokens:** Coinbase Tokenized Stocks B20 - `AAPLc, NVDAc, METAc, GOOGLc` (backed 1:1 via Alpaca, dividends via multiplier) - docs.base.org/base-chain/asset-issuance/tokenized-stocks-on-base
- **Streaming:** Sablier V2 (already on Base) - wraps any ERC20, no oracle needed
- **Frontend:** Next.js + OnchainKit + Wagmi/Viem + Base Mini App SDK
- **Optional yield:** Aerodrome LP fees / Aave as collateral for streamed balance

### Project Structure
```
dripstocks/
├── app/         # Next.js + OnchainKit Mini App (create/stream/withdraw)
├── contracts/   # DripVault.sol wrapper + tests (Foundry)
├── docs/        # Brief, spec, loom script
└── assets/      # Logo, pitch deck
```

### Roadmap to Sep 9
- [ ] Day 1-2: Contracts + Sablier integration on Base Sepolia
- [ ] Day 3: Mini App UI (Create Stream / Dashboard / Withdraw)
- [ ] Day 4: Mainnet B20 integration + Aave collateral view
- [ ] Day 5: Polish + Loom + X post tagging @buildonbase + Google Form submit

### Links
- Contest: https://x.com/buildonbase/status/2095105184120664122
- Brief: https://x.com/i/article/2094829597372088619
- Base Stocks docs: https://blog.base.org/tokenized-stocks
- Submit: https://docs.google.com -> Base Builder Quest - Tokenized Stocks

---
Built on Base. Stocks just got updated.
