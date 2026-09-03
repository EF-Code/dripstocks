# DripStocks

Stream Coinbase tokenized stocks per second on Base.

DripStocks is a streaming-payments prototype built for the Base Builder Quest on tokenized stocks. An employer, DAO, or subscriber funds a stream in a B20 tokenized stock (e.g. `AAPLc`, `NVDAc`), and the recipient withdraws the vested portion at any time. Streams unlock linearly per second, 24/7, entirely onchain.

> Built for the Base Builder Quest – Tokenized Stocks ($5,000 pool; submissions close Sep 9, 2026, 11:59pm EST). See [Links](#links).

## How it works

1. A sender approves a B20 token and creates a stream: recipient, token, amount, duration.
2. The position vests linearly: `vested = total * elapsed / duration`. No cliff, no broker window.
3. The recipient withdraws vested funds whenever they choose. The sender can cancel at any time; unvested funds are refunded and vesting freezes.
4. For recipients without a wallet yet, the sender can create a claimable stream behind a hash. Whoever presents the matching 256-bit secret first becomes the recipient.

The vault holds only what it received (fee-on-transfer safe), validates batch payrolls entry by entry, and uses full-precision multiplication for vesting math. Claim hashes are released when a stream is claimed or cancelled, so identifiers can be reused.

## Features

- Direct streams to any wallet address with per-second linear vesting.
- Claimable streams for wallet-less recipients via hashed secrets.
- Batch payroll creation for multiple recipients in one transaction.
- Sender cancellation with automatic unvested refund.
- B20-aware accounting: received-amount settlement, no rebasing assumptions.

## Repository layout

```
dripstocks/
├── app/         # Next.js 16 + wagmi/viem frontend (create streams, live dashboard)
├── contracts/   # DripVault.sol + Foundry test suite
├── docs/        # Quest brief, design spec, demo script
└── assets/      # Brand assets
```

## Contracts

- `contracts/src/DripVault.sol` — the streaming vault (`createStream`, `createClaimableStream`, `claim`, `withdraw`, `cancel`, `batchCreate`; `vested`/`withdrawable` views).
- Token references (Base mainnet B20 precompiles, see `app/src/lib/b20.ts`): `AAPLc`, `NVDAc`, `METAc`, `GOOGLc`, `MSFTc`, `TSLAc`, with Chainlink feeds recorded for display.
- Live on Base Sepolia: vault [`0x50e9DFD093F5E98AE1e1FC7AF4F87e5650000C49`](https://sepolia.basescan.org/address/0x50e9DFD093F5E98AE1e1FC7AF4F87e5650000C49) with 6 MockB20 tokens (addresses in `TODO.md`), all Sourcify-verified with exact matches. Set the 7 `NEXT_PUBLIC_*` vars (see `app/.env.example`) to point the frontend at them.
- Chainlink prices are shown for reference only; the vault settles in token units and uses no oracle.

## Getting started

Prerequisites: Foundry 1.8+, Node 20+, npm.

```bash
# Contracts: build and test
cd contracts
forge build
forge test

# Frontend: develop and build
cd ../app
npm install
npm run dev      # http://localhost:3000
npm run build
npx vitest run
```

Deploy the vault to Base Sepolia (requires `PRIVATE_KEY` and `BASE_SEPOLIA_RPC` in `contracts/.env`):

```bash
cd contracts
forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC --private-key $PRIVATE_KEY --broadcast
```

Then set the deployed address in `app/.env.local` and redeploy the frontend.

## Testing

- Foundry: 42 unit, edge-case, and proof tests (direct, claimable, batch, cancel, fuzz), plus 5 fork tests against Base mainnet (B20 metadata, Chainlink feeds) and a multi-actor invariant campaign (256 runs).
- Local end-to-end on Anvil: deployed the Sepolia script and exercised create → vest → withdraw, claimable claim → withdraw, batch payroll, and cancel with refund — all succeed.
- Live end-to-end on Base Sepolia with two wallets: direct 1.5 NVDAc stream fully vested and withdrawn in full, claimable 0.5 AAPLc claimed by secret-holder with a correct linear partial withdraw, batch payroll to two recipients, and cancel with exact unvested refund.
- Frontend: 17 vitest tests covering token configuration, wallet setup, and stream components.
- CI (`.github/workflows/ci.yml`) runs the contract suite with fork tests and coverage, plus the frontend build and vitest.

## Security

The contracts completed a Y.T. full-audit pass (record in `.yt/`, validator strict PASS). Seven findings were fixed before this revision: received-amount settlement, batch input validation, claim-hash release, `nonReentrant` coverage on `claim`, overflow-safe vesting math, and documented claim semantics.

Two properties remain the operator's responsibility:

1. Claim secrets must be 256-bit random values shared privately. Knowledge of the secret is sufficient to claim; predictable values such as raw email addresses can be front-run.
2. The vault accepts any ERC20 at the contract level. Production use should restrict funding to the vetted B20 addresses.

## Status and roadmap

Working prototype: contracts implemented, tested, deployed, and verified on Base Sepolia; frontend covers direct streams, claim links, batch payroll, withdraw, claim, and cancel; audit fixes merged. Remaining before submission: deploy the frontend to Vercel (see `TODO.md`), record the demo, and submit the quest form.

## Links

- Quest announcement: https://x.com/buildonbase/status/2095105184120664122
- Request for builders (tokenized stocks): https://x.com/i/article/2094829597372088619
- Tokenized stocks on Base (technical docs): https://docs.base.org/base-chain/asset-issuance/tokenized-stocks-on-base
- Product overview: https://blog.base.org/tokenized-stocks
