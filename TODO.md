# TODO — testnet readiness (Base Sepolia)

## Done
- [x] DripVault: streaming, claim links, batch, cancel (audited, 7 findings fixed)
- [x] MockB20 + DeployTestnet.s.sol (forge build green)
- [x] forge unit suite 42/42 green
- [x] Anvil E2E: create → warp → withdraw, claimable claim → withdraw, batch, cancel+refund
- [x] App: direct/claim-link/batch tabs, claim panel, cancel button, chain-aware Sepolia mocks
- [x] No mock stats or Aave copy left in UI
- [x] vitest 17/17 + next build green
- [x] Sepolia deployment: 13/13 txs, chain 84532
  - Vault: `0x50e9DFD093F5E98AE1e1FC7AF4F87e5650000C49` (Sourcify exact match)
  - Mocks: AAPLc `0x9f5c5b98D47A911aD8606907cFF283c2844c9747`, NVDAc `0x2fF05B9030b8B96c747a9918fA4B976538672906`, METAc `0x522f1C33c4726fe855565Dc5231b72A9549917D8`, GOOGLc `0xE202E3028EA05E8015edf7FfB9c45389c2205bBD`, MSFTc `0x88cc53Dd0Cab95eE486cD0713D29a199713a1551`, TSLAc `0xEC327f9ff8e4eDb845e4ed7E307D7d022C2A9d23` (all Sourcify exact match)
- [x] Wired the 7 addresses into `app/.env.local` (gitignored, never committed)
- [x] Live Sepolia two-wallet E2E (streams 2–5): direct 1.5 NVDAc → full withdraw 1.5; claimable 0.5 AAPLc → claimed by recipient → partial withdraw 0.478 (linear ✓); batch 2×0.25 METAc; cancel → full 0.25 refund
- [x] og.png (real product shot) + custom droplet favicon

## Remaining (needs your Vercel account)
- [ ] Vercel: set the 7 `NEXT_PUBLIC_*` vars from `app/.env.example` → deploy → smoke-test incognito
- [ ] Your click-through on the live URL (second wallet): direct, claim link, batch, withdraw, cancel
- [ ] Record Loom + X post tagging @buildonbase + submit form (needs Builder Code)

## Explicitly out of scope (see docs/DECISIONS.md)
- Mainnet deploy, Aave/Aerodrome, Mini App manifest, Farcaster frames, legal review
