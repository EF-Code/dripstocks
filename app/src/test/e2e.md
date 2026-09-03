# E2E manual checklist (pre-submit)

## Forked local
1. `anvil --fork-url https://mainnet.base.org` (or Sepolia)
2. `cd contracts && forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --private-key 0xac0974... --broadcast`
3. Set `app/.env.local` NEXT_PUBLIC_DRIP_VAULT=0x...
4. `cd app && npm run dev` -> http://localhost:3000

## Flow
- [ ] Connect wallet (Base Sepolia or Anvil)
- [ ] Create stream: 0.1 AAPLc -> bob.base.eth, 7 days, verify tx + event
- [ ] Dashboard ticks live, withdraw 50% at +3.5d, verify vault balance
- [ ] Cancel mid-stream, verify refund + frozen vest
- [ ] Claimable: create with keccak(email), claim via preimage, withdraw
- [ ] Batch: 3 recipients, each withdrawable
- [ ] B20 multiplier: simulate via MockB20.setMultiplier, ensure vault still correct
- [ ] Chainlink: read AAPL feed 0x787f... latestRoundData, verify staleness handling

## Submit artifacts
- [ ] Vercel deploy = Live Project Link
- [ ] Loom 75s per docs/LOOM_SCRIPT.md
- [ ] X post tagging @buildonbase
- [ ] Form with Builder Code
