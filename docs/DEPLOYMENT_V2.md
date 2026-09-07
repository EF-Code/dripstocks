# DripStocks v2 — Base Sepolia deployment record

**Status:** deployed, source-verified, configured, and live. Direct-stream and secure claim flows were exercised on v2. Browser wallet signing, v2 batch creation, v2 cancellation, and claim-stream withdrawal remain pending.

## Release identity

- **Contract release:** `2d058e6` on `master`
- **Audited frontend release:** `59dd29c2f184bf02d4b220c484ac7d28924c73f1`
- **Repository:** `https://github.com/EF-Code/dripstocks`
- **Chain:** Base Sepolia, chain ID `84532`
- **Public site:** `https://dripstocks.vercel.app`
- **CI:** GitHub Actions run `34117603499` passed both `app` and `contracts` jobs for `59dd29c`

## Contract deployment

- **Deployer and owner:** `0x7fb0c9284F181f06cE2366aa273B93D3bCF8601e`
- **Deployment transaction:** `0x70b57c8817617db21a2c0acc098dc8f49ff84e134417d58388969780e8018523`
- **Deployment block:** `46490789`
- **Vault v2:** `0x115Fe60FD510c04fC765D06241623eAda42529B2`
- **Source verification:** `https://sourcify.dev/#/lookup/84532-0x115Fe60FD510c04fC765D06241623eAda42529B2`
- **Compiler:** Solidity `0.8.36`, optimizer `200` runs, EVM `cancun`
- **Local artifacts:** `contracts/broadcast` and `contracts/cache` are ignored and stored with mode `0600`

Fresh RPC readback on 2026-09-07 returned chain ID `84532`, 6,608 bytes of runtime code, `claimProtocolVersion() == 2`, the owner above, and `nextStreamId() == 2`.

## Reused test tokens

All six contracts expose the expected symbol, 18 decimals, and nonempty runtime behavior on Base Sepolia.

| Symbol | Address |
|---|---|
| AAPLc | `0x9f5c5b98D47A911aD8606907cFF283c2844c9747` |
| NVDAc | `0x2fF05B9030b8B96c747a9918fA4B976538672906` |
| METAc | `0x522f1C33c4726fe855565Dc5231b72A9549917D8` |
| GOOGLc | `0xE202E3028EA05E8015edf7FfB9c45389c2205bBD` |
| MSFTc | `0x88cc53Dd0Cab95eE486cD0713D29a199713a1551` |
| TSLAc | `0xEC327f9ff8e4eDb845e4ed7E307D7d022C2A9d23` |

These are open-mint test contracts with no monetary value. Real B20 assets are not used by this deployment.

## Vercel deployment

- **Project:** `ef-code-projects/dripstocks`, Git-linked with `app` as its root
- **Production deployment:** `dripstocks-961x8beq4-ef-code-projects.vercel.app`
- **Deployment ID:** `dpl_Cp7wMKWntmpT3wHbxDgEyFKGBRxj`
- **Source:** redeployment of commit `59dd29c` after correcting the public vault value
- **Alias:** `dripstocks.vercel.app`
- **Vault variable:** `NEXT_PUBLIC_DRIP_VAULT_SEPOLIA=0x115Fe60FD510c04fC765D06241623eAda42529B2` on Production, Preview, and Development
- **Other public configuration:** six Sepolia mock addresses on Production and Preview; WalletConnect project ID on all three environments
- **Removed behavior:** the shared `NEXT_PUBLIC_DRIP_VAULT` fallback and Base-mainnet wallet route are no longer supported by the app

Live HTML readback contains the checksummed v2 vault, Base application ID `6a9c0871384ac6b98c246e16`, the testnet banner, and the functional legacy-management route. It no longer renders the vault as unconfigured.

## Acceptance evidence

Receipt links below belong to the v2 vault unless a row explicitly says otherwise.

| Scenario | Result | Evidence |
|---|---|---|
| Deployment and source | Passed | deployment transaction above; Sourcify match; fresh RPC readback |
| Direct stream | Passed | stream 0 creation `0x14a296f0f0ab90097a96700745cb24ff907e93dc0a52dcf1878c0e95b34ac4cb`; full withdrawal `0x6ef717a01ffa638544ca35e9c45dc74d11c8d60267ea1bde961d62f8ddbf2510` |
| Secure claim | Passed | stream 1 creation `0xc25b8587510b568a810429e5a045f1595ff4a9061a0c90e5e6515516dd2adefa`; claimant-bound commitment `0x1d949ec4467d9ba0d9ee063f1b4abbd518d821a5d2412d0b77cff7459c79ad79`; claim `0x6b9dce32d0af254c3f8afd0ae98cef2ae9176ee5fc0acf11812e2e3c852c13ee` |
| Claim withdrawal | Pending | stream 1 is assigned and fully vested, but its `withdrawn` field remains zero |
| Batch on v2 | Not run | automated contract coverage passed; no v2 public receipt was produced |
| Cancellation on v2 | Not run | automated contract coverage passed; no v2 public receipt was produced |
| Wrong-network guard | Passed locally | the app supports only Base Sepolia and regression tests cover Base mainnet plus explicit legacy-vault overrides |
| Legacy access | Passed locally and deployed | `/legacy` mounts the old vault dashboard for withdrawal/cancellation and omits claim controls |
| Desktop/mobile presentation | Passed | local browser checks at 1280px and 390px showed both routes with no error overlay or horizontal overflow |
| Real-wallet browser flow | Pending | no human wallet signatures were supplied during the audit |

Stream 0 currently records 1 AAPLc total and 1 AAPLc withdrawn. Stream 1 records 0.5 AAPLc total, the claimed recipient `0x7f587B3B77A3bBB1e5356BE34359339c26F78Ed7`, and zero withdrawn.

## Legacy vault

- **Address:** `0x50e9DFD093F5E98AE1e1FC7AF4F87e5650000C49`
- **Route:** `https://dripstocks.vercel.app/legacy`
- **Allowed UI actions:** recipient withdrawal and sender cancellation
- **Blocked UI action:** legacy one-step claim, because a public reveal can be stolen from the mempool

The old bytecode deletes a claim-hash reservation after a successful claim or cancellation. Permanent hash reservations are a v2 property and must not be attributed to the legacy vault. At the latest readback, legacy stream 1 remained unclaimed with 1 mock GOOGLc total and zero withdrawn. There is no migration or privileged sweep.

## Verification

- `npx vitest run`: 44/44 passed
- `npm run lint`: passed
- `npm run build`: passed; `/` and `/legacy` prerendered
- `npm audit --omit=dev`: 0 vulnerabilities after upgrading to Wagmi 3.7.7
- `FOUNDRY_INVARIANT_RUNS=64 FOUNDRY_INVARIANT_DEPTH=64 forge test --no-match-contract DripVaultFork -q`: passed
- Base fork tests: 5/5 passed locally
- GitHub Actions: app, contract, invariant, and coverage steps passed for `59dd29c`

## Remaining manual checks

Use two disposable Base Sepolia wallets on the public site. Reject and then accept a network switch, create and partially withdraw a direct stream, create and redeem a claim stream using a privately shared fresh 32-byte secret, withdraw stream 1 if authorized, create a small batch, and cancel a partially vested v2 stream. Record each new transaction under the exact chain, vault, and stream ID. Do not reuse a claim secret or publish it before the claim is confirmed.

## Rollback

Rollback the frontend to the preceding known-good Vercel deployment only if the current site regresses. Do not point the main page at the legacy vault: that would reintroduce unsafe claim behavior and hide the v2 stream namespace. Both vault contracts remain independently deployed regardless of frontend rollback.
