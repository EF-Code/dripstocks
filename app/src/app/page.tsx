"use client";
import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { CreateStream } from "@/components/CreateStream";
import { StreamDashboard } from "@/components/StreamDashboard";
import { B20_TOKENS } from "@/lib/b20";

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

export default function Home() {
  const [activeId, setActiveId] = useState<bigint | null>(null);

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
              LIVE ON BASE • B20 TOKENIZED STOCKS
            </div>
            <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight">
              Your salary, <br /> streaming in <span className="text-[#0052ff]">NVDA</span> per second.
            </h1>
            <p className="mt-4 text-zinc-300 max-w-xl">
              TradFi pays twice a month in USD. DripStocks streams Coinbase Tokenized Stocks (AAPLc, NVDAc, METAc, GOOGLc) every second on Base — 24/7, composable, withdraw anytime.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {Object.values(B20_TOKENS).map((t) => (
                <span key={t.symbol} className="rounded-full bg-white text-black px-3 py-1 text-xs font-medium">
                  {t.logo} {t.symbol} • {t.address.slice(0, 6)}…{t.address.slice(-4)}
                </span>
              ))}
            </div>
          </div>
          <div className="flex-1 md:max-w-sm bg-white text-black rounded-xl p-5">
            <div className="text-xs font-semibold tracking-widest text-zinc-500">LIVE TICKER</div>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm"><span>NVDAc → alice.base.eth</span><span className="font-mono text-emerald-600">+0.0000007/s</span></div>
              <div className="h-2 bg-zinc-100 rounded-full overflow-hidden"><div className="h-full w-[42%] bg-black" /></div>
              <div className="text-xs text-zinc-500">0.42 / 1.00 NVDAc streamed • Withdraw anytime • Use as Aave collateral</div>
              <div className="pt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-zinc-50 p-2"><div className="text-xs text-zinc-500">STREAMS</div><div className="font-semibold">12.4k</div></div>
                <div className="rounded-lg bg-zinc-50 p-2"><div className="text-xs text-zinc-500">VOLUME</div><div className="font-semibold">$2.1M</div></div>
                <div className="rounded-lg bg-zinc-50 p-2"><div className="text-xs text-zinc-500">CHAIN</div><div className="font-semibold">Base</div></div>
              </div>
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
          <p className="text-sm text-zinc-500">Live ticking balances • Withdraw as collateral</p>
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
