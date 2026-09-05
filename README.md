# DripStocks

[![CI](https://github.com/EF-Code/dripstocks/actions/workflows/ci.yml/badge.svg)](https://github.com/EF-Code/dripstocks/actions/workflows/ci.yml)
**Live demo:** https://dripstocks.vercel.app/ (Base Sepolia testnet)

Payroll that streams by the second, in tokenized stocks.

DripStocks is a streaming-payments prototype built for the Base Builder Quest on tokenized stocks. A sender funds a stream in a B20 tokenized stock (e.g. `AAPLc`, `NVDAc`); the position vests linearly per second and the recipient withdraws at any time. The demo runs on Base Sepolia with mock B20 tokens — real B20 tokens exist only on Base mainnet, and the app already carries their addresses for later.

> Built for the Base Builder Quest – Tokenized Stocks ($5,000 pool; submissions close Sep 9, 2026, 11:59pm EST). See [Links](#links).

## How it works

1. A sender approves a token and creates a stream: recipient, token, amount, duration.
2. The position vests linearly (`vested = total * elapsed / duration`). No cliff, no broker window.
3. The recipient withdraws vested funds whenever they choose. The sender can cancel at any time; unvested funds are refunded and vesting freezes.
4. Recipients without a wallet yet can be paid through a claim link: whoever presents the matching 256-bit secret first becomes the recipient. Batch payroll pays many recipients in one transaction.

The vault settles exactly what it received (fee-on-transfer safe), validates every batch entry, and computes vesting in full precision. Claim identifiers are released on claim or cancel, so they can be reused.

## Repository layout

```
dripstocks/
├── app/         # Next.js 16 + wagmi/viem frontend (create streams, live dashboard)
├── contracts/   # DripVault.sol + Foundry test suite
└── docs/        # Quest brief, scope decisions, demo script
```

## Contracts

- `contracts/src/DripVault.sol` — the streaming vault: `createStream`, `createClaimableStream`, `claim`, `withdraw`, `cancel`, `batchCreate`, plus `vested`/`withdrawable` views. Immutable, no owner functions, no fees.
- Token references (Base mainnet B20 precompiles, see `app/src/lib/b20.ts`): `AAPLc`, `NVDAc`, `METAc`, `GOOGLc`, `MSFTc`, `TSLAc`, with Chainlink feeds recorded for display only — the vault settles in token units and uses no oracle.
- Live on Base Sepolia: vault [`0x50e9DFD093F5E98AE1e1FC7AF4F87e5650000C49`](https://sepolia.basescan.org/address/0x50e9DFD093F5E98AE1e1FC7AF4F87e5650000C49) with 6 MockB20 tokens (addresses in `TODO.md`), all Sourcify-verified with exact matches. The frontend reads its 7 addresses from `NEXT_PUBLIC_*` vars (see `app/.env.example`).

## Getting started

Prerequisites: Foundry 1.8+, Node 22+, npm.

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

Fresh Sepolia deployment (requires `PRIVATE_KEY` and `BASE_SEPOLIA_RPC` in the environment):

```bash
cd contracts
forge script script/DeployTestnet.s.sol --rpc-url $BASE_SEPOLIA_RPC --private-key $PRIVATE_KEY --broadcast
```

Then set the 7 logged addresses in `app/.env.local` and redeploy the frontend.

## Testing

- Foundry: 42 unit, edge-case, and proof tests (direct, claimable, batch, cancel, fuzz), plus 5 fork tests against Base mainnet (B20 metadata, Chainlink feeds) and a multi-actor invariant campaign (256 runs).
- Local end-to-end on Anvil: create → vest → withdraw, claimable claim → withdraw, batch payroll, and cancel with refund — all succeed.
- Live end-to-end on Base Sepolia with two wallets, all replayable from the receipts in `TODO.md`: direct 1.5 NVDAc stream fully vested and withdrawn in full, claimable 0.5 AAPLc claimed by secret-holder with a linear partial withdraw, batch payroll to two recipients, and cancel with exact unvested refund.
- Frontend: 18 vitest tests covering token configuration, wallet setup, and stream components.
- CI runs the contract unit suite with coverage plus the frontend build and vitest; the live-fork suite stays local-only (see `.github/workflows/ci.yml` for why).

## Security

The contracts went through a structured full-audit pass (validator strict PASS at the time; record kept out of the repo). Seven findings were fixed: received-amount settlement, batch input validation, claim-hash release, `nonReentrant` coverage on `claim`, overflow-safe vesting math, and documented claim semantics.

Two properties remain the operator's responsibility:

1. Claim secrets must be 256-bit random values shared privately. Knowledge of the secret is sufficient to claim; predictable values such as raw email addresses can be front-run.
2. The vault accepts any ERC20 at the contract level. Production use should restrict funding to the vetted B20 addresses.

## Status

Demo-complete: contracts implemented, tested, deployed, and verified on Base Sepolia; frontend live on Vercel covering direct streams, claim links, batch payroll, withdraw, claim, and cancel; audit fixes merged. Remaining before submission: record the demo, post on X tagging @buildonbase, and file the quest form.

## Links

- Live app: https://dripstocks.vercel.app/
- Quest announcement: https://x.com/buildonbase/status/2095105184120664122
- Request for builders (tokenized stocks): https://x.com/i/article/2094829597372088619
- Tokenized stocks on Base (technical docs): https://docs.base.org/base-chain/asset-issuance/tokenized-stocks-on-base
- Product overview: https://blog.base.org/tokenized-stocks
