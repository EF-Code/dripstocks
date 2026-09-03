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
- [x] Live Sepolia two-wallet E2E (streams 2–5, all replayable on Basescan):
  - id2 created https://sepolia.basescan.org/tx/0xa0157c5771debd68b8ea702918cec5c9603fd789cf583c30195d07af1ebf0c82 → full withdraw 1.5 https://sepolia.basescan.org/tx/0x0f38723d214a032965264c2b999290ec32f51bbe6fa21ada0546e6643f2dde19
  - id3 created https://sepolia.basescan.org/tx/0xbdbdd6adbd26cc2f45a4d537912576818e3ab301fa2a07114cdf931b4c4948e5 → claimed https://sepolia.basescan.org/tx/0xc39089daec25a687d6c42b97271628ee4263625ba4c0e0602e203d68a32a92e8 → partial withdraw 0.478 (linear ✓) https://sepolia.basescan.org/tx/0x7250e4df84d6cd1bc02b1b4099dd2f29738f9aa624c232de512982d058a15e6e
  - ids 4+5 batch https://sepolia.basescan.org/tx/0xfd85e6945359ad5fe6d2f20cde4fe2174e27ca2999e51b2124e77f77e5d40134 → id4 cancel + exact 0.25 refund https://sepolia.basescan.org/tx/0xb48c784c175c407c3368afdf66f8ef709f51fb17d7d7cbfa726beb031c66fd1e
- [x] Sourcify exact-match verification: vault https://sourcify.dev/#/lookup/84532-0x50e9DFD093F5E98AE1e1FC7AF4F87e5650000C49 (mocks verify identically by address)
- [x] og.png (real product shot) + custom droplet favicon

## Remaining
- [x] Vercel live: https://dripstocks.vercel.app/ (root dir `app`, 7 env vars set; vault + mocks render, zero page errors)
- [ ] Vercel dashboard → Analytics tab → Enable Web Analytics (until then `/_vercel/insights/script.js` 404s; redeploy after enabling)
- [ ] Your click-through on the live URL (second wallet): direct, claim link, batch, withdraw, cancel
- [ ] Record Loom + X post tagging @buildonbase + submit form (needs Builder Code)

## Explicitly out of scope (see docs/DECISIONS.md)
- Mainnet deploy, Aave/Aerodrome, Mini App manifest, Farcaster frames, legal review
