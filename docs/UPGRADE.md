# DripStocks v2 deployment runbook and model handoff

Prepared 2026-09-07. This document is an implementation guide, not a deployment receipt. **No new contract deployment, remote push, or Vercel configuration change was performed while writing it.** Read the entire guide before executing a broadcast or changing production configuration.

## 1. Objective and release boundaries

Release the audited DripStocks source to **Base Sepolia, chain ID 84532**, replacing the frontend's primary vault with a newly deployed v2 vault while reusing the six existing MockB20 contracts. Preserve direct streaming, batch streaming, cancellation, withdrawal, wallet connection, Base app metadata, and Vercel Analytics. Verify the new two-transaction claim flow using two distinct test wallets.

This remains a testnet contest demo. Do not deploy on Base mainnet, transfer real stock tokens, implement bridging, submit contest forms, or publish social posts as part of this release. The production Vercel environment means the public website; it does **not** mean mainnet blockchain deployment.

The existing vault is immutable. Updating source files, verifying source, changing an environment variable, or deploying a website cannot patch its bytecode or move its funds. New vault stream IDs start independently. Always identify a stream by **chain + vault address + stream ID**, never by ID alone.

Use this guide as a verified starting point, then reconcile it against current files and live account state. Do not invent missing addresses, transaction receipts, credentials, project IDs, ownership, or successful test results.

## 2. Repository snapshot and work already completed

- Workspace: `/home/hiro/Projects/dripstocks`.
- Git remote observed: `https://github.com/EF-Code/dripstocks.git`.
- Baseline HEAD observed: `243a231b7009974468af15285c1f41a262c97cea`.
- **The audit changes and this guide are currently uncommitted. A fresh clone at that SHA will not contain them.** Transfer or commit the actual reviewed working tree before handing off to a different machine. Do not deploy baseline HEAD alone.
- Prior OpenCode context: session `ses_f9a6e6e2dffe96do5MKcqZK054`, recorded for `~/Flatland`; the current deployment workspace is the path above. Use the actual repository, not a stale duplicate checkout.
- Observed public site: `https://dripstocks.vercel.app`. Reconfirm the Vercel project, team, connected repository, production branch, and domain ownership before changing settings.

The local audit implemented permanent claim-hash reservations, claimant-bound commit/reveal, legacy-protocol gating in the UI, explicit chain IDs on writes, transaction simulations, fresh approval/balance checks, receipt handling, malformed-input rejection, wallet reconnect/error handling, and older-stream pagination/ID lookup. Regression tests accompany these changes.

Most recent local verification: 37 frontend tests passed, ESLint passed, Next.js production build passed, and Foundry reported 51 passing tests using invariant settings of 64 runs and depth 64. The grouped invariant campaign exercised 4,096 calls. The default longer invariant run was stopped in favor of this bounded run; do not call it completed. Live fork tests and real-wallet tests were not rerun for v2. Repeat appropriate checks after further implementation changes.

Read these files before modifying or deploying:

| File | Purpose |
| --- | --- |
| `contracts/src/DripVault.sol` | Exact contract being deployed, including claim commitments and reservations |
| `contracts/script/Deploy.s.sol` | Vault-only deployment; currently needs a chain guard |
| `contracts/script/DeployTestnet.s.sol` | Six new mocks plus vault; not the normal upgrade path |
| `contracts/foundry.toml` | Compiler, EVM and optimizer settings |
| `contracts/test/ClaimProtocol.t.sol` | Claim protocol and attack regression tests |
| `contracts/test/DripVault.Invariant.t.sol` | Solvency, reservation, accounting and handler coverage |
| `app/src/lib/b20.ts` | Token configuration, address selection and frontend ABI |
| `app/src/lib/wagmi.ts` | Wallet connectors, transports and SSR configuration |
| `app/src/components/CreateStream.tsx` | Approval, creation, fresh secrets and receipt handling |
| `app/src/components/StreamDashboard.tsx` | Claim preparation, redemption, pagination and withdrawal |
| `app/src/app/layout.tsx` | Base metadata and Analytics integration |
| `app/.env.example` | Public environment-variable names, not usable deployed values |
| `.github/workflows/ci.yml` | Existing CI checks and fork-test exclusion rationale |
| `TODO.md` | Historical addresses and legacy transaction receipts |

## 3. Chain and address inventory

Legacy vault: `0x50e9DFD093F5E98AE1e1FC7AF4F87e5650000C49` on Base Sepolia. Keep this address in documentation and in the legacy-access plan. Do not overwrite historical receipts to make them look like v2 evidence.

Existing token addresses below were read from `TODO.md`; they are **candidates to revalidate on-chain**, not fresh RPC verification:

| Symbol | Public variable | Existing Sepolia mock address |
| --- | --- | --- |
| AAPLc | `NEXT_PUBLIC_SEPOLIA_AAPLC` | `0x9f5c5b98D47A911aD8606907cFF283c2844c9747` |
| NVDAc | `NEXT_PUBLIC_SEPOLIA_NVDAC` | `0x2fF05B9030b8B96c747a9918fA4B976538672906` |
| METAc | `NEXT_PUBLIC_SEPOLIA_METAC` | `0x522f1C33c4726fe855565Dc5231b72A9549917D8` |
| GOOGLc | `NEXT_PUBLIC_SEPOLIA_GOOGLC` | `0xE202E3028EA05E8015edf7FfB9c45389c2205bBD` |
| MSFTc | `NEXT_PUBLIC_SEPOLIA_MSFTC` | `0x88cc53Dd0Cab95eE486cD0713D29a199713a1551` |
| TSLAc | `NEXT_PUBLIC_SEPOLIA_TSLAC` | `0xEC327f9ff8e4eDb845e4ed7E307D7d022C2A9d23` |

For each token, check nonempty bytecode, `symbol()`, `decimals()` and wallet balances using a verified Sepolia RPC. The UI assumes 18 decimals. Stop on a mismatch; do not silently treat a different token as the expected mock. Read `MockB20.sol` before minting test balances, and use only small amounts needed for the smoke tests.

## 4. Prerequisites and secure local setup

Use Node.js 22 to match CI, the committed npm lockfile, Git submodules for contract dependencies, and Foundry v1.8.1 to match the existing workflow. The currently installed Forge path is `/home/hiro/.config/.foundry/versions/foundry-rs/foundry/v1.8.1/forge`. Prefer the existing installation; verify its version rather than installing a different nightly. If Python is needed, use `/home/hiro/.venv/bin/python`.

Run these individually from the repository root and inspect each result:

```bash
pwd
git status --short
git diff --stat
git log -5 --oneline
git remote -v
git submodule status
node --version
npm --version
```

Initialize missing submodules with `git submodule update --init --recursive`. Review all existing uncommitted work; never reset or overwrite it. Record the release source SHA once code is committed, and capture the exact compiler settings and source hash used for deployment.

For a shell using the installed Foundry bundle:

```bash
export PATH="/home/hiro/.config/.foundry/versions/foundry-rs/foundry/v1.8.1:$PATH"
forge --version
cast --version
```

Required capabilities: a working Sepolia RPC, a testnet-funded signer, two distinct test-wallet addresses, access to the existing Vercel project and Git remote, and a supported source-verification service. Discover available authenticated tools before asking for credentials. Never print a full environment, private key, seed phrase, token, authenticated RPC URL, or unredacted deployment cache.

The current deployment script reads `PRIVATE_KEY` through `vm.envUint`. If using it unchanged, let the operator supply that variable securely outside chat and source control, without terminal tracing. Do not put a literal private key in command arguments or add it to Vercel. A keystore-based workflow is also acceptable, but requires adapting and testing the script's signer handling; adding `--account` does not override its existing `vm.envUint` logic.

`BASE_SEPOLIA_RPC` denotes the selected RPC URL. Confirm `cast chain-id --rpc-url "$BASE_SEPOLIA_RPC"` returns exactly **84532**, then confirm signer address and test ETH balance. Never reuse a mainnet-funded key merely for convenience. If credentials are unavailable, finish preparation and report the exact missing capability; do not ask for a secret to be pasted into the conversation.

## 5. Mandatory implementation work before broadcast

### 5.1 Guard the vault-only deployment script

`DeployTestnet.s.sol` now rejects chains other than 84532 and 31337, but it deploys six new tokens. `Deploy.s.sol` deploys only a vault and currently lacks that guard. Add `UnsupportedChain(uint256)` and the same chain check at the beginning of `run()`, **before reading PRIVATE_KEY**. Add a regression proving a mainnet chain ID reverts before key access. Preserve the existing constructor owner choice unless the user explicitly specifies another owner.

Improve the script's output to report chain ID, new vault address and owner using `console2`, or reliably parse the deployment artifact. Do not rely on the unused `vault` variable or an ambiguous terminal summary. Rebuild after script edits. Do not combine this upgrade with a compiler, dependency or contract redesign.

### 5.2 Preserve access to legacy funds

The current dashboard selects a single configured vault. Merely replacing its environment variable makes old streams disappear from that view. Before public cutover, provide and test a concrete legacy-access route: for example, a clearly labelled legacy page with the old address explicitly selected, or a retained safe deployment with current guarded UI and the legacy address. Preserve withdrawal/cancellation for already assigned recipients and senders. Label every legacy view with its vault address and network.

Do not restore an old frontend that submits unsafe one-step claim transactions. The current v2 UI intentionally blocks legacy claim creation/redemption. Unclaimed legacy streams need an explicit owner/user decision: cancellation refunds only the unvested portion, and an unclaimed vested portion can remain in the old contract. There is no implemented privileged sweep or automatic migration. Explain outstanding amounts and limitations; never promise to recover all funds or silently strand users by declaring migration complete.

Inventory relevant legacy streams and record how their owners can access them. Do not move, cancel, or withdraw someone else's streams as a deployment housekeeping step.

### 5.3 Make testnet configuration unambiguous

`b20.ts` retains a deprecated `NEXT_PUBLIC_DRIP_VAULT` fallback shared by known chains. Remove that variable from the deployment environments rather than assigning the new Sepolia vault to it. Set the explicit Sepolia variable; leave mainnet unconfigured or explicitly zero. Inspect actual source consumption of `NEXT_PUBLIC_CHAIN_ID`: a variable listed in `.env.example` is not proof that the wallet configuration uses it. Verify real wallet-network behavior in the browser.

## 6. Local verification gate

From `app/`:

```bash
npm ci
npx vitest run
npm run lint
npm run build
```

From `contracts/`:

```bash
forge build
FOUNDRY_INVARIANT_RUNS=64 FOUNDRY_INVARIANT_DEPTH=64 forge test --no-match-contract Fork
```

Add `--offline` only if the configured compiler is already cached. Record output and exit codes. The observed config is Solidity 0.8.36, optimizer enabled with 200 runs, EVM target Cancun; verify the file has not changed. If running the full default invariant campaign, allow it to complete and report its actual scope. Do not lower CI coverage silently to manufacture a pass.

Existing CI excludes live fork tests because of the documented OP-stack `Missing operator fee scalar for isthmus L1 Block` issue. Distinguish an infrastructure failure from a contract regression. A skipped fork test is not a pass and does not replace live Sepolia readbacks or wallet testing.

Run `git diff --check`. If changing ABI or contract signatures, explicitly compare the frontend ABI with the compiled artifact. For v2, the errors are `InvalidCommitment()` and `CommitmentNotMature()`, not earlier proposed names.

Gate: all relevant local tests pass, script guard exists and is tested, source is reviewable, token addresses validate, signer and chain are correct, and legacy access has a concrete plan.

## 7. Deploy the new vault exactly once

Choose the **vault-only** script. Use `DeployTestnet.s.sol` only if deliberately bootstrapping a fresh environment and accepting six new mock addresses. That is not needed for this upgrade.

First simulate from `contracts/`, with the securely supplied signer environment:

```bash
forge script script/Deploy.s.sol:Deploy --rpc-url "$BASE_SEPOLIA_RPC"
```

Review the simulated chain, sender, constructor owner, transaction count, deployment bytecode and gas estimate. Fund only the testnet gas needed with a reasonable buffer. Immediately before broadcast, repeat the chain-ID check. Then:

```bash
forge script script/Deploy.s.sol:Deploy --rpc-url "$BASE_SEPOLIA_RPC" --broadcast
```

Capture the transaction hash and contract address from `broadcast/Deploy.s.sol/84532/run-latest.json` or the actual emitted artifact path. Keep the full artifacts locally with restrictive permissions; sanitize any published receipt. Do not commit entire broadcast/cache folders.

If the command times out or the RPC disconnects, **do not immediately rerun deployment**. Query the known transaction hash and sender nonce, inspect the broadcast artifact, and establish whether the transaction mined, is pending, was replaced, or never broadcast. Reconcile before choosing `--resume` or any retry; inspect the installed tool's help for its exact resume behavior. A second successful create transaction makes another independent vault, not a retry of the first one.

After a successful receipt, assign `NEW_VAULT` to the actual address, then read:

```bash
cast code "$NEW_VAULT" --rpc-url "$BASE_SEPOLIA_RPC"
cast call "$NEW_VAULT" 'claimProtocolVersion()(uint256)' --rpc-url "$BASE_SEPOLIA_RPC"
cast call "$NEW_VAULT" 'owner()(address)' --rpc-url "$BASE_SEPOLIA_RPC"
cast call "$NEW_VAULT" 'nextStreamId()(uint256)' --rpc-url "$BASE_SEPOLIA_RPC"
```

Expected: nonempty code, protocol **2**, intended deployer/owner, and initially zero streams before smoke transactions. Record deployment block and successful receipt status. If any result differs, stop the frontend cutover and investigate.

## 8. Verify the exact deployed source

Use the compiled source/settings from the deployment, including the constructor's owner address. Do not rebuild with changed optimizer/compiler settings and call it an exact match. Prefer the currently supported Sourcify or explorer workflow; check installed `forge verify-contract --help` before executing service-specific options.

Example Sourcify command shape, after filling real public values:

```bash
forge verify-contract "$NEW_VAULT" src/DripVault.sol:DripVault \
  --chain 84532 --verifier sourcify \
  --constructor-args "$(cast abi-encode 'constructor(address)' "$DEPLOYER_ADDRESS")" \
  --watch
```

This command contains only public constructor data. If provider behavior or CLI flags differ, adapt using official documentation and retain the same source/settings. Source-verification submission alone is not completion: open the resulting page, confirm chain/address and final verification status, and save its URL. Retry verification independently if needed; do not deploy another vault merely because an explorer is slow. Mark an unresolved verification failure explicitly and keep production cutover pending.

## 9. Frontend environment configuration

Preserve the existing project and mocks. Set public values in **Development, Preview and Production** as needed; inspect branch-specific Preview overrides too. Public addresses are not secrets, but no signer or deployer credential belongs in any `NEXT_PUBLIC_*` variable.

| Setting | Required treatment |
| --- | --- |
| `NEXT_PUBLIC_DRIP_VAULT_SEPOLIA` | Actual verified new v2 address |
| Six `NEXT_PUBLIC_SEPOLIA_*` variables | Revalidated existing mocks from section 3 |
| `NEXT_PUBLIC_DRIP_VAULT_BASE` | Unset or zero; no mainnet deployment |
| `NEXT_PUBLIC_DRIP_VAULT` | Remove deprecated fallback |
| `NEXT_PUBLIC_WC_PROJECT_ID` | Preserve valid existing Reown/WalletConnect public project ID |
| `NEXT_PUBLIC_CHAIN_ID` | If used, 84532; still verify source and wallet behavior |

Update local `app/.env.local` carefully without replacing unrelated settings. It must remain ignored. Do not upload local secret-bearing files to Vercel or print them in full. Preview and production must each receive the intended public configuration before their build.

Vercel environment edits affect **new deployments**, not existing ones. Build a fresh deployment after the address change; do not assume promoting an old preview will recompile its public variables. [Vercel environment documentation](https://vercel.com/docs/environment-variables).

Inspect the project's effective build root. The Next.js package lives in `app/`; normally the Vercel Root Directory is `app`, install uses the lockfile, and build runs `npm run build`. Preserve an existing equivalent working configuration. Do not accidentally create a second Vercel project or deploy from `contracts/`.

Confirm `app/src/app/layout.tsx` retains `base:app_id` = `6a9c0871384ac6b98c246e16` and renders `<Analytics />` imported from `@vercel/analytics/next`. The package is already installed; do not reinstall it as a substitute for checking integration. Builder code `bc_ey64zw0o` is provided project context; do not invent a transaction-attribution implementation or change metadata to store it unless separately required and validated.

## 10. Git, Preview and production sequence

Use the implementing prompt's authorization to commit and push core release files. Review the staged diff before each commit. Prefer meaningful separation: audited fixes/tests, deployment preparation/legacy access, then sanitized deployment documentation. Never stage `.env*` secrets, `.yt/`, private audit reports, raw wallet/RPC output, broadcast caches, or unrelated user work. Keep this runbook as project documentation if appropriate.

Do not assume `main` is the production branch; verify Vercel and Git settings. Push the reviewed release branch to obtain a Preview when supported. Validate Preview with the new vault before advancing the production branch. If pushing the production branch triggers an automatic Vercel deployment, ensure Production variables are already correct before that push. Avoid duplicate CLI and Git deployments.

Inspect the Preview deployment's actual source SHA, build logs, root directory and public URL. Resolve failures in the exact revision being released. Follow the existing Git integration for production, or use an authenticated supported Vercel deployment tool if that is the established workflow. In either case, verify the resulting production deployment SHA and domain alias. A successful local build or accepted push is not evidence that the public site is updated.

## 11. Two-wallet acceptance matrix

Use two independently controlled test wallets A and B with Sepolia test ETH. Use small mock balances and short durations of at least one minute (the UI minimum). Record public transaction hashes, stream IDs, chain, vault and expected/observed outcomes. Never record unclaimed secrets in screenshots, logs, issue bodies or the deployment report. Avoid verbose RPC tracing while entering or revealing them.

| Scenario | Actions and acceptance criteria |
| --- | --- |
| Network guard | Connect on an unsupported chain. The app requests Sepolia and blocks writes. Reject switching and verify a clear error. Switch successfully and confirm contract writes carry chain ID 84532. |
| Reconnect | Refresh with a previously connected wallet. No duplicate connect prompts; loading resolves; wallet/address and network remain accurate. Disconnect and reconnect both wallets. |
| Direct stream | A approves the new vault, then creates a small stream to B. Each button stays busy through receipt. B sees the stream and withdraws vested tokens. Check balances, `withdrawn` and receipt status. |
| Allowance refresh | After approval, create becomes usable without a page reload. After creation, allowance/balance reflect chain state. Unknown/failed reads cannot enable an assumed approval. |
| Rejection/failure | Reject one wallet request, trigger an insufficient-balance case, and simulate an RPC read failure locally if practical. UI recovers and displays safe errors without exposing call arguments or secrets. |
| Claim v2 | A generates a fresh random secret and creates a claimable stream. Save its ID and share the secret privately with B. B clicks Prepare, waits for the commit receipt plus two confirmations, then Claim. Verify the recipient becomes B and B can withdraw. |
| Claim reset | The sender's creation form clears the used secret after success. New claim creation requires a new secret. Changing recipient claim fields invalidates the prepared state. |
| Batch | A funds at least two intended recipients; check emitted IDs individually and resulting balances. Invalid/zero recipient and excessive batch input are rejected. |
| Cancellation | Cancel a partially vested stream as its sender. Refund equals total minus vested at the actual cancellation block. Recipient entitlement freezes and remains withdrawable. Do not compare against a stale wall-clock estimate. |
| Older streams | Reach a known owned stream beyond the latest global page using pagination and ID lookup. External-wallet streams must not expose unauthorized actions. Run large-ID/input regressions locally rather than flooding public testnet. |
| Legacy | The documented legacy route still reaches original streams for permitted withdrawal/cancellation, clearly displays the old vault, and blocks unsafe legacy claim flow. |
| Presentation | Test desktop and mobile widths, wallet modal, loading states, long hashes and disconnected view. Capture sanitized screenshots without claim secrets or account credentials. |
| Production integrations | Inspect rendered Base meta tag; visit and navigate the real site with content blockers disabled to test Analytics; confirm the network request succeeds and data appears when available. |

For a direct stream: before cancellation, vested is floor(total × elapsed / duration), capped at total; after cancellation use frozen on-chain values. Transaction timestamps determine accounting. Account for gas only in ETH balances, not ERC20 balances. Any token transfer fee or unexpected decimal behavior requires investigation; do not relax expected results to fit a mismatch.

Claim security detail: the commitment is `keccak256(abi.encode(vault, chainId, streamId, claimant, preimage))`. Compute locally using `encodeAbiParameters`, not packed encoding. Do **not** call `claimCommitmentHash` through a public RPC with the secret; that sends it to the provider before protection is established. Copied commitments cannot authorize another claimant. A reveal requires a commitment from a previous block. This protects same-block copying, not a secret leaked earlier or a reveal censored long enough for an attacker to mature their own commitment. Continue using fresh 256-bit randomness and private sharing.

If testing requires a human wallet signature that the model cannot perform, record that scenario as pending and request only the required interaction. Do not label a mocked test as real-wallet verification.

## 12. Failure handling and rollback

- **Broadcast uncertain:** reconcile receipt, nonce and artifacts before retrying. Never deploy twice blindly.
- **Verification pending:** retry the verification service, retaining deployment source/settings; do not redeploy solely for verification.
- **Protocol read fails or returns non-2:** verify chain, address and bytecode; keep claim controls disabled. Do not remove protocol gating to make the demo appear functional.
- **Website still uses old address:** inspect environment scope, branch overrides and deployment SHA; rebuild with correct values and hard-refresh. An env edit cannot rewrite an existing bundle.
- **Wallet still reports old approval:** allowance is per token/owner/spender. The new vault needs its own approval; do not tell users the old approval carries over.
- **New streams absent:** check wallet identity, selected chain, actual vault address, receipt and lookup ID. New and old IDs are unrelated.
- **RPC rate limiting:** retry read-only calls with backoff or a verified alternative Sepolia endpoint. Do not issue duplicate writes.
- **UI regression after cutover:** roll back to a known safe UI build or disable the affected feature while preserving access to both vaults. An old pre-audit frontend may re-enable unsafe claims and is not automatically a safe rollback.
- **Contract defect after deployment:** bytecode cannot be patched. Stop new funding through the UI, document existing liabilities and recovery options, and prepare a separately reviewed replacement. Do not imply the owner can sweep funds.

Rolling back Vercel changes only the website. It does not revert transactions, approvals, vesting, or balances. Preserve both addresses and public receipts throughout any rollback.

## 13. Required completion evidence

Create a sanitized release record, for example `docs/DEPLOYMENT_V2.md`, containing:

1. UTC timestamp, release source SHA, remote branch and CI run URL/status for that SHA.
2. Chain ID, RPC identity without credentials, deployer public address and constructor owner.
3. Compiler version, optimizer/EVM settings, deployment transaction, block, vault address and verification URL/status.
4. Fresh on-chain readbacks for code presence, protocol version, owner and stream counter, with observation time.
5. The six reused mock addresses and checked symbols/decimals.
6. Vercel project identity, effective root, deployment ID/URL, source SHA and production domain readback. Record public configuration only.
7. Acceptance matrix with Passed / Failed / Pending / Not run for each row, public receipt links and sanitized screenshots where helpful.
8. Legacy inventory/access instructions, unresolved legacy claims and any limitations.
9. Local verification commands/results, exact invariant scope, and explicit fork/manual-test limitations.
10. Rollback target or safe recovery procedure, remaining actions and final working-tree status.

Completion means the contract and public frontend are both verified, the real domain uses the intended new address, required flows have real evidence, and old funds remain accessible through the documented route. If any required gate is blocked, finish independent work and report the precise blocker; do not fabricate a complete release.

## 14. References and continuing verification

The repository is authoritative for its current implementation. Consult installed `forge`, `cast` and Vercel CLI help for command support before execution. For platform behavior use official sources: [Vercel environment variables](https://vercel.com/docs/environment-variables), [Vercel Git deployments](https://vercel.com/docs/git), [Foundry documentation](https://getfoundry.sh/), and [Base documentation](https://docs.base.org/). Service endpoints and account configuration can change; verify them at execution time.

The accompanying `docs/DEPLOYMENT_HANDOFF_PROMPT.md` supplies the execution request for another model. Give it access to this modified working tree, not only the baseline remote clone.
