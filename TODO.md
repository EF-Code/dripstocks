# TODO — testnet readiness (Base Sepolia)

## Done
- [x] DripVault: streaming, claim links, batch, cancel (audited, 7 findings fixed)
- [x] MockB20 + DeployTestnet.s.sol (forge build green)
- [x] forge unit suite 42/42 green
- [x] Anvil E2E: create → warp → withdraw, claimable claim → withdraw, batch, cancel+refund
- [x] App: direct/claim-link/batch tabs, claim panel, cancel button, chain-aware Sepolia mocks
- [x] No mock stats or Aave copy left in UI
- [x] vitest 17/17 + next build green

## Remaining (needs a funded Base Sepolia key)
- [ ] Fund a Sepolia wallet (https://sepolia.base.org faucet / bridge from Sepolia ETH)
- [ ] `cd contracts && BASE_SEPOLIA_RPC=https://sepolia.base.org PRIVATE_KEY=0x... forge script script/DeployTestnet.s.sol --rpc-url $BASE_SEPOLIA_RPC --broadcast`
- [ ] Copy the 7 logged addresses into `app/.env.local` (see `app/.env.example`)
- [ ] `cd app && npm run dev` → full click-through on Sepolia: direct, claim link, batch, withdraw, cancel
- [ ] Deploy frontend (Vercel) → Live Project Link for the quest form
- [ ] Record Loom + X post tagging @buildonbase + submit form (needs Builder Code)

## Explicitly out of scope (see docs/DECISIONS.md)
- Mainnet deploy, Aave/Aerodrome, Mini App manifest, Farcaster frames, legal review
