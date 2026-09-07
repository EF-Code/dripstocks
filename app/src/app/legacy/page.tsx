"use client";

import Link from "next/link";

const LEGACY_VAULT = "0x50e9DFD093F5E98AE1e1FC7AF4F87e5650000C49" as const;
const LEGACY_CHAIN = 84532;

export default function LegacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Legacy vault</h1>
      <p className="mt-2 text-sm text-muted">
        This page preserves access to the original immutable vault on <span className="font-mono">Base Sepolia</span>. New streams are created in the v2 vault on the{" "}
        <Link href="/" className="underline underline-offset-2 hover:text-ink">main page</Link>. Stream IDs are scoped to a vault — always cite <span className="font-mono">chain + vault + id</span>.
      </p>
      <div className="mt-4 rounded-xl border border-hairline bg-card p-4 font-mono text-xs">
        <div className="text-muted">LEGACY VAULT (immutable, prior streams remain)</div>
        <div className="mt-1 break-all">
          {LEGACY_VAULT} · chain {LEGACY_CHAIN} ·{" "}
          <a href={`https://sepolia.basescan.org/address/${LEGACY_VAULT}`} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
            Basescan
          </a>{" "}
          ·{" "}
          <a href={`https://sourcify.dev/#/lookup/${LEGACY_CHAIN}-${LEGACY_VAULT}`} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
            Sourcify
          </a>
        </div>
        <div className="mt-2 font-sans text-xs text-muted">
          Permitted actions: <span className="font-semibold text-ink">withdraw</span> as the assigned recipient, <span className="font-semibold text-ink">cancel</span> as the sender. Creating new claim links on this vault is disabled — use the v2 vault on the main page, which requires a committed secret and a separate claim transaction.
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Switch your wallet to Base Sepolia (84532) to interact.
      </div>
      <div className="mt-6 rounded-2xl border border-hairline bg-card p-6 text-sm">
        <div className="font-semibold">How to access legacy funds</div>
        <p className="mt-2 text-muted">
          The legacy vault is immutable and still holds its original streams. Use direct contract calls (e.g. via <code className="rounded bg-paper px-1 py-0.5 font-mono text-xs">cast call</code> / <code className="rounded bg-paper px-1 py-0.5 font-mono text-xs">cast send</code> or Basescan&apos;s write panel) with the legacy vault address:
        </p>
        <pre className="mt-3 overflow-auto rounded-lg bg-panel p-3 font-mono text-xs text-white">
{`# view a legacy stream
cast call ${LEGACY_VAULT} "streams(uint256)(address,address,address,uint256,uint256,uint256,uint256,bool,bytes32)" 0 --rpc-url https://sepolia.base.org

# withdraw as the recipient
cast send ${LEGACY_VAULT} "withdraw(uint256)" 0 --private-key $PRIVATE_KEY --rpc-url https://sepolia.base.org

# cancel as the sender (refund is total - vested at cancellation block)
cast send ${LEGACY_VAULT} "cancel(uint256)" 0 --private-key $PRIVATE_KEY --rpc-url https://sepolia.base.org`}
        </pre>
        <p className="mt-3 text-xs text-muted">
          Do not use the old one-step claim flow — it is unsafe and intentionally not exposed here. Unclaimed legacy claimable streams can still be claimed after cancel in the current code, but the vested portion remains locked until claimed; the vault retains the hash reservation permanently.
        </p>
      </div>
      <div className="mt-6 rounded-xl border border-hairline bg-paper p-4 text-xs text-muted">
        <div className="font-semibold text-ink">Outstanding liabilities</div>
        <div className="mt-1">
          Unclaimed legacy claimable streams remain in this vault. Their vested portion can be withdrawn only after a valid claim; if never claimed, it stays locked. Cancellation refunds only the unvested portion. There is no privileged sweep or automatic migration — the new vault starts at its own stream IDs.
        </div>
      </div>
    </div>
  );
}
