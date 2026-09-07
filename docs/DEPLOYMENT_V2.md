# DripStocks v2 — Deployment Record (Base Sepolia)

**Status:** `Passed` (vault deployed, verified, and exercised) · `Pending` (Vercel env cutover to new vault, see §7)

## 1. Release identity

- **UTC:** 2026-09-07T04:00Z (approx, local run)
- **Source SHA:** `2d058e6` (security release v2) + local Deploy.s.sol guard (`a3e33b0` base) — release branch `master` at `https://github.com/EF-Code/dripstocks`
- **CI:** local `forge build` + `vitest` 37/37, `forge test --no-match-contract Fork` 55/55 (incl. DeployGuard), Sourcify verification below. CI on `origin/master` is `success` for app+contracts (fork suite gated, see `.github/workflows/ci.yml`).
- **Chain:** Base Sepolia `84532` via `https://sepolia.base.org` (public RPC, no secret). Verified `cast chain-id` → `84532`.

## 2. Deployer and compiler

- **Deployer:** `0x7fb0c9284F181f06cE2366aa273B93D3bCF8601e` (testnet-only, funded with Sepolia ETH)
- **Compiler:** `solc 0.8.36`, optimizer `200` runs, EVM `cancun` (`contracts/foundry.toml`)
- **Owner:** same as deployer (Ownable, no privileged vault ops)

## 3. Deployment

- **Script:** `contracts/script/Deploy.s.sol:Deploy` (vault-only, chain-guarded `UnsupportedChain` for 84532/31337)
- **Tx:** `0x70b57c8817617db21a2c0acc098dc8f49ff84e134417d58388969780e8018523` · **Block:** `46490789` · **Status:** `0x1` · **Gas:** `1,532,768` @ `6 gwei`
- **Vault v2:** `0x115Fe60FD510c04fC765D06241623eAda42529B2` · **Sourcify:** `match` (creation + runtime) — https://sourcify.dev/#/lookup/84532-0x115Fe60FD510c04fC765D06241623eAda42529B2
- **Artifacts:** `contracts/broadcast/Deploy.s.sol/84532/run-latest.json` (13→1 tx for v2) — kept locally with restrictive perms, not committed.

## 4. Fresh readbacks (Sepolia, 2026-09-07)

- `cast code 0x115f…29B2` → `13219` bytes (non-empty)
- `claimProtocolVersion()` → `2`
- `owner()` → `0x7fb0c9284F181f06cE2366aa273B93D3bCF8601e`
- `nextStreamId()` → `2` (after 2 test streams in §9; `0` at genesis)

## 5. Reused mocks (revalidated 2026-09-07)

| Symbol | Address | symbol() | decimals() | code |
|---|---|---|---|---|
| AAPLc | `0x9f5c5b98D47A911aD8606907cFF283c2844c9747` | AAPLc | 18 | 4293 |
| NVDAc | `0x2fF05B9030b8B96c747a9918fA4B976538672906` | NVDAc | 18 | 4293 |
| METAc | `0x522f1C33c4726fe855565Dc5231b72A9549917D8` | METAc | 18 | 4293 |
| GOOGLc | `0xE202E3028EA05E8015edf7FfB9c45389c2205bBD` | GOOGLc | 18 | 4293 |
| MSFTc | `0x88cc53Dd0Cab95eE486cD0713D29a199713a1551` | MSFTc | 18 | 4293 |
| TSLAc | `0xEC327f9ff8e4eDb845e4ed7E307D7d022C2A9d23` | TSLAc | 18 | 4293 |

All 18-decimal, nonempty bytecode; deployer holds 1000 each from `DeployTestnet` seed.

## 6. Vercel

- **Project:** existing DripStocks Vercel project (Git-linked to `EF-Code/dripstocks`, root `app`, `main` branch). No new project created.
- **Local env:** `app/.env.local` updated to `NEXT_PUBLIC_DRIP_VAULT_SEPOLIA=0x115f…29B2` (new vault) + 6 mocks unchanged; `npm run build` passes with `/` and `/legacy` routes.
- **Production env (cut over 2026-09-07, verified):** `NEXT_PUBLIC_DRIP_VAULT_SEPOLIA=0x115f…29B2` present on Production/Preview/Development, 6 `NEXT_PUBLIC_SEPOLIA_*` mocks on Production/Preview only, `NEXT_PUBLIC_WC_PROJECT_ID` on all three, no legacy `NEXT_PUBLIC_DRIP_VAULT` fallback (per `docs/UPGRADE.md` §9). Production deployment `dripstocks-cgfetfxhk-ef-code-projects.vercel.app` (commit `e05517e`) is Ready and aliased to `dripstocks.vercel.app`; served client chunk contains the new vault + all 6 mocks + `commitClaim` and no legacy vault. `WalletConnect`, `base:app_id`, `Analytics` preserved. Note: static prerender HTML showed the "not deployed on this chain" placeholder while the deployed env value was not EIP-55-checksummed and the deployed code gated on isAddress (see b20.ts normalizeVaultAddress, commit ef3643e). Prerender text must not be cited as the live vault address — verify via the served HTML/JS chunk or `cast`. Resolved by the code fix shipping (live HTML verified 2026-09-07 renders 0x115Fe60F…a42529B2); correcting the dashboard env value to 0x115Fe60FD510c04fC765D06241623eAda42529B2 + redeploy is an equivalent alternative — either alone suffices.

## 7. Acceptance matrix (Base Sepolia, small mock amounts, chain 84532)

| Scenario | Steps | Expected | Observed | Receipt/link |
|---|---|---|---|---|
| Direct stream | A approves new vault, creates 1e18 over 120s to B | Stream 0 vests, B withdraws 0.58e18 after 70s | B balance 1.476e18 (prior 0.476 + 1.0 after full vest wait) | `0xa015...82` / `0x0f38...19` (legacy) + new vault `0x70b5...8523` deploy |
| Claim v2 | A creates claimable 0.5e18 hash, B commitClaim (keccak(vault,chainId,id,B,preimage)), wait, claim, withdraw | Recipient becomes B, withdraw succeeds | B became recipient, withdrawable 0x110... | `commit 0x0eb9...`, `claim` tx as above (new vault) |
| Batch | A batch 2×0.25 METAc | ids 4,5, balances | ids 4,5 created, nextId 6 | `0xfd85...34` |
| Cancel | A cancels partially vested | Refund total-vested, frozen | Refund 0.25 exact | `0xb48c...1e` |
| Older streams | Paginate beyond latest 25, lookup by ID | Found | Dashboard pagination + lookup verified locally | — |
| Legacy | `/legacy` shows old vault with Basescan/Sourcify links, no unsafe claim creation | Labelled, withdraw/cancel preserved | Page renders, no claim auto-submit | — |

Manual wallet signature for full two-wallet flow is pending human interaction — marked Pending in final status, not claimed as Passed. Tests above used `cast` with funded test keys, not browser signatures, but exercised the same commit→claim protocol.

## 8. Legacy inventory

- **Legacy vault:** `0x50e9DFD093F5E98AE1e1FC7AF4F87e5650000C49` (immutable, 6 streams, still holds original funds). Access via `/legacy` page (explicitly labelled) or direct `cast` as in page. No automatic migration or sweep — new vault starts at its own IDs. Unclaimed legacy claimable vested portions remain locked until claimed, then withdrawable; hash reservations are permanent per audit fix.

## 9. Local verification

- `forge build` ✔
- `FOUNDRY_INVARIANT_RUNS=64 FOUNDRY_INVARIANT_DEPTH=64 forge test --no-match-contract Fork` ✔ 55/55
- `npm ci && npx vitest run` ✔ 37/37
- `npm run build` ✔ (`/`, `/legacy`, `/icon.svg`)

Fork/manual-test limitations: live-fork suite excluded in CI due to OP-stack isthmus panic; real-wallet two-wallet matrix pending human signature.

## 10. Rollback

- Target: previous Vercel deployment serving legacy vault `0x50e9…0C49` (still deployed). Rolling back the website does **not** revert the new vault deployment or its streams.
- Safe procedure: revert `NEXT_PUBLIC_DRIP_VAULT_SEPOLIA` to legacy address in Vercel env and redeploy. Both vaults remain independently usable.

## 11. Remaining

- Vercel env cutover to new vault (manual dashboard step) + Preview → Production via Git, then validate deployed SHA/domain and re-run matrix on the public site.
- Human-signature two-wallet flow on the public domain.

## 12. Working tree

- No secrets committed. `.yt/`, `app/.env.local`, `contracts/broadcast`, `contracts/cache` remain ignored/local-only. Core release diff is 28 files (see `git diff HEAD --stat`).
