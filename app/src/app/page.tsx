"use client";
import { useState } from "react";
import { useAccount, useChainId, useConnect, useDisconnect, useReadContract } from "wagmi";
import { CreateStream } from "@/components/CreateStream";
import { StreamDashboard } from "@/components/StreamDashboard";
import { getTokens, DRIP_VAULT_ABI, getVaultAddress } from "@/lib/b20";

function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono bg-zinc-100 px-2 py-1 rounded">{address?.slice(0, 6)}…{address?.slice(-4)}</span>
        <button onClick={() => disconnect()} className="text-xs border px-3 py-1 rounded-full">Disconnect</button>
      </div>
    );
  }
  return (
    <button onClick={() => connect({ connector: connectors[0] })} className="rounded-full bg-[#0052ff] text-white px-4 py-2 text-sm font-medium">
      Connect Wallet
    </button>
  );
}

function VaultStats({ vaultAddress }: { vaultAddress: `0x${string}` }) {
  const { data: nextId } = useReadContract({
    address: vaultAddress,
    abi: DRIP_VAULT_ABI,
    functionName: "nextStreamId",
    query: { enabled: vaultAddress !== "0x0000000000000000000000000000000000000000", refetchInterval: 5000 },
  });
  return (
    <div className="pt-3 grid grid-cols-3 gap-2 text-center">
      <div className="rounded-lg bg-zinc-50 p-2"><div className="text-xs text-zinc-500">STREAMS</div><div className="font-semibold">{nextId !== undefined ? Number(nextId) : "—"}</div></div>
      <div className="rounded-lg bg-zinc-50 p-2"><div className="text-xs text-zinc-500">VAULT</div><div className="font-mono text-xs pt-1">{vaultAddress === "0x0000000000000000000000000000000000000000" ? "not set" : `${vaultAddress.slice(0, 6)}…${vaultAddress.slice(-4)}`}</div></div>
      <div className="rounded-lg bg-zinc-50 p-2"><div className="text-xs text-zinc-500">SETTLES IN</div><div className="font-semibold">Token units</div></div>
    </div>
  );
}

export default function Home() {
  const [activeId, setActiveId] = useState<bigint | null>(null);
  const chainId = useChainId();
  const vaultAddress = getVaultAddress(chainId);
  const tokens = getTokens(chainId);
  const onTestnet = chainId === 84532;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-black text-white grid place-items-center font-bold">◉</div>
            <div>
              <div className="font-semibold leading-none">DripStocks</div>
              <div className="text-xs text-zinc-500">Stocks as Streaming Money • Built on Base</div>
            </div>
          </div>
          <WalletButton />
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl w-full px-6 pt-10 pb-6">
        <div className="rounded-2xl bg-black text-white p-8 md:p-10 flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {onTestnet ? "TESTNET • BASE SEPOLIA • MOCK TOKENS" : "LIVE ON BASE • B20 TOKENIZED STOCKS"}
            </div>
            <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight">
              Your salary, <br /> streaming in <span className="text-[#0052ff]">NVDA</span> per second.
            </h1>
            <p className="mt-4 text-zinc-300 max-w-xl">
              DripStocks streams {onTestnet ? "mock " : ""}tokenized stocks (AAPLc, NVDAc, METAc, GOOGLc) every second — 24/7, withdraw anytime. Fund a stream, watch it vest live, claim with a secret link, or run payroll for a whole team.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {Object.values(tokens).map((t) => (
                <span key={t.symbol} className="rounded-full bg-white text-black px-3 py-1 text-xs font-medium">
                  {t.logo} {t.symbol}{t.mock ? " (mock)" : ""} • {t.address === "0x0000000000000000000000000000000000000000" ? "not set" : `${t.address.slice(0, 6)}…${t.address.slice(-4)}`}
                </span>
              ))}
            </div>
          </div>
          <div className="flex-1 md:max-w-sm bg-white text-black rounded-xl p-5">
            <div className="text-xs font-semibold tracking-widest text-zinc-500">VAULT STATUS</div>
            <div className="mt-3 space-y-2">
              <div className="text-xs text-zinc-500">Direct streams, claim links, and batch payroll — all settling in token units, no oracle, no custody beyond the vault.</div>
              <VaultStats vaultAddress={vaultAddress} />
            </div>
          </div>
        </div>
      </section>

      {/* Main */}
      <main className="mx-auto max-w-6xl w-full px-6 grid md:grid-cols-2 gap-6 pb-16">
        <div className="rounded-2xl bg-white border p-6">
          <h2 className="font-semibold">Create Stream</h2>
          <p className="text-sm text-zinc-500">Payroll, creator subs, rent — stream any B20 stock</p>
          <div className="mt-4">
            <CreateStream onCreated={setActiveId} />
          </div>
        </div>
        <div className="rounded-2xl bg-white border p-6">
          <h2 className="font-semibold">Your Streams</h2>
          <p className="text-sm text-zinc-500">Live ticking balances • Withdraw, claim, or cancel</p>
          <div className="mt-4">
            <StreamDashboard highlightId={activeId} />
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t bg-white">
        <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-zinc-500 flex flex-wrap gap-4 justify-between">
          <span>Built for Base Builder Quest • Tokenized Stocks • Ends Sep 9, 2026</span>
          <span>B20 precompiles on Base • Chainlink 24/5 feeds • Docs: docs.base.org</span>
        </div>
      </footer>
    </div>
  );
}
