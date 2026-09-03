# TODO - Ship by Sep 9 11:59pm EST

## P0 - Must for submission
- [ ] Init Next.js + OnchainKit + Wagmi in app/ (Base Mini App template)
- [ ] Integrate Sablier V2 ABIs on Base / Base Sepolia
- [ ] Fetch B20 addresses (AAPLc, NVDAc, METAc, GOOGLc) from docs.base.org
- [ ] Create Stream page (select token, amount, duration, recipient)
- [ ] Stream Dashboard with live ticking + Withdraw
- [ ] Deploy DripVault.s.sol to Base Sepolia, test with mocks
- [ ] Record Loom + X post tagging @buildonbase
- [ ] Submit Google Form

## P1 - Wow factor
- [ ] Claim link for email recipients (no wallet yet)
- [ ] Aave collateral preview (read Aave Base market for B20)
- [ ] Aerodrome swap widget (USDC -> B20)
- [ ] Base Mini App manifest + Farcaster Frame

## P2 - Polish
- [ ] Logo + OG image (assets/)
- [ ] README with demo gif + contract addresses
- [ ] Deploy to Vercel

## Commands
```
cd ~/Projects/dripstocks/app && npx create-onchain --mini  # or next init
cd ~/Projects/dripstocks/contracts && forge init --vscode
```
