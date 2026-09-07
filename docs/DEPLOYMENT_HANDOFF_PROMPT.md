# Copy-paste implementation prompt

Give the implementing model access to the current modified repository, including the uncommitted audit changes, `docs/UPGRADE.md`, and this file. A clone of the old remote alone is insufficient. Paste the text below as your request.

---

You are implementing and deploying the DripStocks security release. Work in `/home/hiro/Projects/dripstocks`. Read `AGENTS.md` and the entire `docs/UPGRADE.md` before making changes. Treat that runbook as the detailed task specification, but verify current source, tools, chain state and account configuration rather than assuming its snapshot is still current. Use `/home/hiro/.venv/bin/python` for any Python work.

I authorize you to complete the necessary scoped implementation, run tests, deploy the updated vault to **Base Sepolia only (84532)** using my available testnet signer, verify its source, update the existing DripStocks Vercel project's relevant public environment settings, deploy Preview and production, and commit/push the reviewed core release changes to the existing repository. The public production website must remain a testnet demo. This does not authorize mainnet activity, unrelated changes, secret publication, social posts, contest submission, or moving/canceling existing user streams. Do not ask again for actions already covered by this authorization; ask only for a genuinely missing decision or human interaction, and continue independent work while waiting.

Your job is to implement the release, not merely repeat the guide or provide another plan. Preserve existing functionality and finish all verifiable steps. First reconcile the working tree: the audit was based on `243a231b7009974468af15285c1f41a262c97cea`, but the fixes were uncommitted when the handoff was written. Do not deploy that old SHA without the actual fixes. Preserve unrelated user changes and never reset the checkout to make it clean.

Required execution order:

1. Inspect the repository, release diff, current remote/branch, contract ABI, test configuration, existing Vercel project and available authenticated tools. Identify missing prerequisites without printing secrets. Record a short concrete plan and keep concise progress updates.
2. Complete the runbook's prerequisites, especially the chain guard and public deployment output in the vault-only `Deploy.s.sol`, with a regression proving the guard runs before private-key access. Reuse the six existing mocks after on-chain validation. Do not run the full fresh-mock deployment accidentally.
3. Establish a working, clearly labelled legacy-vault access route before cutover. The old vault is immutable and still contains its original streams. Preserve permitted withdrawal/cancellation and do not re-enable unsafe legacy claims. Report unclaimed legacy liabilities honestly; do not claim an automatic migration or sweep exists.
4. Run the relevant frontend tests, lint/build and contract tests, including an explicitly reported invariant campaign. Verify frontend ABI alignment. Resolve failures before broadcast. Keep live-fork limitations distinct from real Sepolia checks.
5. Confirm chain 84532, signer and testnet gas balance; simulate the vault-only deployment; review it; broadcast once. On uncertain output, reconcile transaction/nonce/artifacts before any retry. Capture the actual address and receipt. Read bytecode, protocol version 2, owner and stream counter; verify exact source with matching compiler/optimizer/constructor settings.
6. Configure the explicit new Sepolia vault address and revalidated existing mocks. Remove the deprecated shared vault fallback from relevant Vercel environments; leave mainnet unconfigured. Preserve WalletConnect settings, Base metadata and Analytics. Verify the actual project root and branch-specific overrides. Build fresh after environment changes.
7. Deploy and validate Preview, then release production through the existing workflow. Avoid duplicate Git-triggered and CLI deployments. Verify the actual deployed SHA and public domain, not just a successful push or local build.
8. Execute the runbook's two-wallet acceptance matrix with small mock amounts. Validate approval refresh, direct streaming, commit-then-claim, withdrawal, batch, cancellation, reconnect, wrong-network handling, older-stream lookup and legacy access. Test desktop/mobile presentation. Keep claim secrets out of screenshots, logs and reports. If a human signature is unavailable, mark that test pending instead of claiming it passed.
9. Write `docs/DEPLOYMENT_V2.md` with sanitized release evidence, public receipts, verification URL, deployment SHA, Vercel deployment URL, test scope, legacy access and remaining limitations. Make meaningful commits of core project changes only. Keep `.yt/`, secret files, private audit artifacts and raw broadcast/cache output local. Inspect the staged diff before committing.
10. Finish with a concise status distinguishing Passed, Pending and Not run; include the new vault address, site, verification link, release SHA, test results and any exact blocker. Do not declare complete until the runbook's completion criteria are met.

Important constraints:

- Never paste, print or commit a private key, seed, access token, secret-bearing RPC URL or unclaimed claim secret. Use existing secure credential mechanisms. Do not request secrets in chat.
- The current script reads `PRIVATE_KEY`; do not assume `--account` changes that. If adapting signer handling, test the adaptation.
- Calculate claim commitments locally using the exact ABI encoding in the contract. Do not send the secret to a public RPC to calculate its hash. Do not remove protocol gating or permanent hash reservations to bypass an error.
- The new vault needs a new token allowance. Updating the frontend address does not move funds or approvals, and stream IDs are scoped to a vault.
- A Vercel rollback does not revert blockchain state. Never roll back to unsafe claim behavior.
- Do not make unsolicited dependency/compiler upgrades, expand to mainnet, or redo a broad audit unless a concrete deployment issue requires focused investigation.
- Use the current tools' help and official documentation when flags or services differ from the guide. Explain material deviations and preserve evidence.
- No prompt guarantees a flawless deployment. Rely on checked preconditions, test results and live readbacks; never invent success to satisfy the requested outcome.

Proceed with the implementation now, following `docs/UPGRADE.md` from beginning to end.
