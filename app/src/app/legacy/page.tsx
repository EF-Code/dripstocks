"use client";

import Link from "next/link";
import { ChainBanner, WalletButton } from "@/components/WalletControls";
import { StreamDashboard } from "@/components/StreamDashboard";

const LEGACY_VAULT = "0x50e9DFD093F5E98AE1e1FC7AF4F87e5650000C49" as const;
const LEGACY_CHAIN = 84532;

export default function LegacyPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-hairline bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/" className="font-display text-lg font-semibold">DripStocks</Link>
          <WalletButton />
        </div>
      </header>
      <ChainBanner />
      <main className="mx-auto max-w-3xl px-6 py-10">
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
      <div className="mt-6 rounded-2xl border border-hairline bg-card p-6">
        <h2 className="font-display text-xl font-semibold">Manage legacy streams</h2>
        <p className="mt-1 text-sm text-muted">Connect the sender or assigned recipient wallet. This dashboard is locked to Base Sepolia and the legacy address above. Claim controls are omitted.</p>
        <div className="mt-5">
          <StreamDashboard vaultAddress={LEGACY_VAULT} claimsEnabled={false} />
        </div>
      </div>
      <div className="mt-6 rounded-2xl border border-hairline bg-card p-6 text-sm">
        <div className="font-semibold">How to access legacy funds</div>
        <p className="mt-2 text-muted">
          The legacy vault is immutable. The wallet dashboard above is the preferred route. Advanced users can independently inspect a stream with a read-only call:
        </p>
        <pre className="mt-3 overflow-auto rounded-lg bg-panel p-3 font-mono text-xs text-white">
{`cast call ${LEGACY_VAULT} "streams(uint256)(address,address,address,uint256,uint256,uint256,uint256,bool,bytes32)" 0 --rpc-url https://sepolia.base.org`}
        </pre>
        <p className="mt-3 text-xs text-muted">
          Do not use the old one-step claim flow unless you understand and accept its public-mempool theft risk. It is intentionally not exposed here. Unlike v2, the immutable legacy bytecode deletes a claim-hash reservation after claim or cancellation; the permanent-reservation guarantee applies only to the new vault.
        </p>
      </div>
      <div className="mt-6 rounded-xl border border-hairline bg-paper p-4 text-xs text-muted">
        <div className="font-semibold text-ink">Outstanding liabilities</div>
        <div className="mt-1">
          At the latest audit readback, legacy stream #1 remained unclaimed with 1 mock GOOGLc. Its vested balance can be withdrawn only after the unsafe legacy claim succeeds; cancellation refunds only an unvested portion. There is no privileged sweep or automatic migration. Re-check live state before acting because this inventory can change.
        </div>
      </div>
      </main>
    </div>
  );
}
