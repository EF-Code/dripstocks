# DripStocks — Scope Lock (testnet target)

Decided for the contest build. Testnet is Base Sepolia; there is no mainnet deployment and no commercial launch, so no legal track.

## Target

- Fully working on Base Sepolia (chain id 84532) with mock B20 tokens and a deployed `DripVault`.
- Base mainnet B20 precompile addresses stay configured in the app for later, but nothing is deployed or funded there.

## Flows (all supported, all exposed in UI)

- Direct streams, claimable streams (256-bit random secrets only), batch payroll, sender cancel with refund, recipient withdraw.
- No flow exists in the contract without a corresponding UI path.

## Token policy

- Contract stays permissionless (any ERC20), matching the audited design.
- The public app is locked to Base Sepolia and offers the six deployed mocks. Mainnet B20 references remain in the library for future work, but the wallet config exposes no mainnet transaction path.

## Upgradeability and fees

- `DripVault` is immutable, no owner functions, no fees. No rescue path by design.

## Explicitly out of scope

- Aave collateral, Aerodrome swaps, Chainlink price enforcement, Base Mini App manifest, Farcaster frames.
- The Chainlink feed addresses remain in config for reference only.

## Testnet reality

- Real B20 tokens exist only as Base mainnet precompiles, so Sepolia uses `MockB20` tokens (open mint = testnet faucet behavior) with the same 18-decimal interface plus `multiplier`/`scaledBalanceOf`.
- The demo discloses mocks; the contracts and UI are identical across chains except token addresses.
