# TODO — testnet readiness (Base Sepolia)

## Done
- [x] DripVault: streaming, claim links, batch, cancel (audited, 7 findings fixed)
- [x] MockB20 + DeployTestnet.s.sol (forge build green)
- [x] forge unit suite 42/42 green
- [x] Anvil E2E: create → warp → withdraw, claimable claim → withdraw, batch, cancel+refund
- [x] App: direct/claim-link/batch tabs, claim panel, cancel button, chain-aware Sepolia mocks
- [x] No mock stats or Aave copy left in UI
- [x] vitest 17/17 + next build green

## Remaining
- [x] Funded Sepolia wallet + ran DeployTestnet.s.sol (13/13 txs, chain 84532)
  - Vault: `0x50e9DFD093F5E98AE1e1FC7AF4F87e5650000C49`
  - Mocks: AAPLc `0x9f5c…c9747`, NVDAc `0x2fF0…72906`, METAc `0x522f…9917D`, GOOGLc `0xE202…20bBD`, MSFTc `0x88cc…31551`, TSLAc `0xEC32…A9d23`
- [x] Wired the 7 addresses into `app/.env.local` (gitignored, never committed)
- [ ] `cd app && npm run dev` → full click-through on Sepolia: direct, claim link, batch, withdraw, cancel
- [ ] Deploy frontend (Vercel) → Live Project Link for the quest form
- [ ] Record Loom + X post tagging @buildonbase + submit form (needs Builder Code)

## Explicitly out of scope (see docs/DECISIONS.md)
- Mainnet deploy, Aave/Aerodrome, Mini App manifest, Farcaster frames, legal review
