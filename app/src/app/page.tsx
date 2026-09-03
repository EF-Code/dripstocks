"use client";
import { useState } from "react";
import { useAccount, useChainId, useConnect, useDisconnect, useReadContract, useSwitchChain } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { CreateStream } from "@/components/CreateStream";
import { StreamDashboard } from "@/components/StreamDashboard";
import { TickerTape } from "@/components/TickerTape";
import { getTokens, DRIP_VAULT_ABI, getVaultAddress } from "@/lib/b20";
import { WALLET_CONNECT_READY } from "@/lib/wagmi";

const SUPPORTED = [8453, 84532] as const;

function LogoMark() {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden>
      <rect width="34" height="34" rx="9" fill="#0E1420" />
      <path d="M17 5.5c2.6 3.4 4.6 5.9 4.6 8.6a4.6 4.6 0 1 1-9.2 0c0-2.7 2-5.2 4.6-8.6Z" fill="#0052FF" />
      <path d="M9 24.5h16" stroke="#12B76A" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="3 3" className="flow-line animate-flow" />
    </svg>
  );
}

function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);
  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-ink px-3 py-1.5 font-mono text-xs text-white tnum">{address?.slice(0, 6)}…{address?.slice(-4)}</span>
        <button onClick={() => disconnect()} className="rounded-full border border-hairline bg-card px-3 py-1.5 text-xs font-medium hover:border-ink">Disconnect</button>
      </div>
    );
  }
  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="whitespace-nowrap rounded-full bg-baseblue px-4 py-2 text-sm font-semibold text-white hover:bg-basedark sm:px-5"
      >
        Connect wallet
      </button>
      {open && (
        <>
          <button aria-hidden tabIndex={-1} onClick={() => setOpen(false)} className="fixed inset-0 cursor-default" />
          <div role="menu" aria-label="Choose a wallet" className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-hairline bg-card p-2 shadow-xl">
            {connectors.map((c) => (
              <button
                key={c.uid}
                role="menuitem"
                disabled={isPending}
                onClick={() => { setOpen(false); connect({ connector: c }); }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-paper disabled:opacity-50"
              >
                <span>{c.name === "Injected" ? "Browser wallet" : c.name}</span>
                <span className="text-xs text-muted">{c.id === "walletConnect" ? "QR code" : c.id === "coinbaseWalletSDK" ? "Smart Wallet" : "Extension"}</span>
              </button>
            ))}
            {!WALLET_CONNECT_READY && (
              <div className="rounded-xl px-3 py-2.5 text-xs text-muted">
                WalletConnect QR appears here once a project ID is configured.
              </div>
            )}
            {error && <div role="alert" className="px-3 py-2 text-xs text-danger">Connection failed: {error.message.slice(0, 140)}</div>}
          </div>
        </>
      )}
    </div>
  );
}

function ChainBanner() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  if (!isConnected || (SUPPORTED as readonly number[]).includes(chainId)) return null;
  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-2.5 text-sm">
        <span className="font-medium">Unsupported network.</span>
        <span className="text-muted">DripStocks runs on Base Sepolia (testnet) and Base mainnet.</span>
        <button
          onClick={() => switchChain({ chainId: baseSepolia.id })}
          disabled={isPending}
          className="rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {isPending ? "Switching…" : "Switch to Base Sepolia"}
        </button>
      </div>
    </div>
  );
}

function VaultConsole({ vaultAddress, chainId }: { vaultAddress: `0x${string}`; chainId?: number }) {
  const { data: nextId } = useReadContract({
    address: vaultAddress,
    abi: DRIP_VAULT_ABI,
    functionName: "nextStreamId",
    query: { enabled: vaultAddress !== "0x0000000000000000000000000000000000000000", refetchInterval: 5000 },
  });
  const deployed = vaultAddress !== "0x0000000000000000000000000000000000000000";
  return (
    <div className="rounded-2xl border border-pipeline bg-panel p-6 text-white shadow-2xl">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-semibold tracking-widest text-white/70">
          <span className="live-dot h-2 w-2 animate-livedot rounded-full bg-mint" />
          VAULT CONSOLE
        </span>
        <span className="rounded-full border border-pipeline px-2.5 py-1 font-mono text-[11px] text-white/70 tnum">
          {chainId === 84532 ? "base-sepolia" : chainId === 8453 ? "base" : "unknown chain"}
        </span>
      </div>
      <div className="mt-5 font-mono text-xs text-white/50">VAULT</div>
      <div className="font-mono text-sm text-white tnum">{deployed ? `${vaultAddress.slice(0, 10)}…${vaultAddress.slice(-8)}` : "not deployed on this chain"}</div>
      <svg viewBox="0 0 300 44" className="mt-5 w-full" aria-hidden>
        <line x1="8" y1="22" x2="292" y2="22" stroke="#1d2c46" strokeWidth="2" />
        <line x1="8" y1="22" x2="292" y2="22" stroke="#12B76A" strokeWidth="2" strokeDasharray="6 6" className="flow-line animate-flow" />
        <circle cx="8" cy="22" r="4" fill="#0052FF" />
        <circle cx="292" cy="22" r="4" fill="#12B76A" />
      </svg>
      <div className="flex justify-between font-mono text-[11px] text-white/50">
        <span>SENDER</span>
        <span>VAULT</span>
        <span>RECIPIENT</span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-pipeline p-3">
          <div className="text-[11px] tracking-widest text-white/50">STREAMS</div>
          <div className="font-display text-2xl font-semibold tnum">{nextId !== undefined ? Number(nextId) : "—"}</div>
        </div>
        <div className="rounded-xl border border-pipeline p-3">
          <div className="text-[11px] tracking-widest text-white/50">SETTLEMENT</div>
          <div className="font-display text-2xl font-semibold">1s</div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const chainId = useChainId();
  const vaultAddress = getVaultAddress(chainId);
  const tokens = getTokens(chainId);
  const onTestnet = chainId === 84532;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-hairline bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <LogoMark />
            <div className="min-w-0">
              <div className="font-display text-[17px] font-semibold leading-none tracking-tight">DripStocks</div>
              <div className="mt-1 hidden text-xs text-muted sm:block">Streaming payroll in tokenized stocks</div>
            </div>
          </div>
          <WalletButton />
        </div>
      </header>
      <ChainBanner />

      <section className="mx-auto w-full max-w-6xl px-6 pb-8 pt-10 md:pt-14">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-hairline bg-card px-3 py-1 text-xs font-semibold tracking-wide">
              <span className="live-dot h-1.5 w-1.5 animate-livedot rounded-full bg-mint" />
              {onTestnet ? "TESTNET · BASE SEPOLIA · MOCK TOKENS" : "BASE · B20 TOKENIZED STOCKS"}
            </p>
            <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.02] tracking-tight md:text-6xl">
              Payroll that streams by the second.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Fund a stream in {Object.keys(tokens).slice(0, 4).join(", ")}, and more — it vests every second,
              withdrawable anytime. Claim links for wallet-less teammates, batch payroll for whole teams.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#create" className="rounded-full bg-baseblue px-6 py-3 text-sm font-semibold text-white hover:bg-basedark">
                Start a stream
              </a>
              <a href="#track" className="rounded-full border border-ink/20 bg-card px-6 py-3 text-sm font-semibold hover:border-ink">
                Track streams
              </a>
            </div>
            <p className="mt-5 text-xs text-muted">
              {onTestnet
                ? "Testnet build: balances are MockB20 tokens with no monetary value."
                : "Real B20 tokens settle in token units — 1 token ≠ 1 share across corporate actions."}
            </p>
          </div>
          <VaultConsole vaultAddress={vaultAddress} chainId={chainId} />
        </div>
      </section>

      <TickerTape chainId={chainId} />

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-10 md:grid-cols-2">
        <section id="create" aria-label="Create a stream" className="scroll-mt-24 rounded-2xl border border-hairline bg-card p-6 shadow-[0_1px_0_rgba(14,20,32,0.04)] md:p-7">
          <p className="text-xs font-semibold tracking-[0.14em] text-baseblue">CREATE</p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">Fund a stream</h2>
          <p className="mt-1 text-sm text-muted">Direct, claim link, or batch payroll.</p>
          <div className="mt-5">
            <CreateStream />
          </div>
        </section>
        <section id="track" aria-label="Track streams" className="scroll-mt-24 rounded-2xl border border-hairline bg-card p-6 shadow-[0_1px_0_rgba(14,20,32,0.04)] md:p-7">
          <p className="text-xs font-semibold tracking-[0.14em] text-baseblue">TRACK</p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">Watch money move</h2>
          <p className="mt-1 text-sm text-muted">Live vesting — withdraw, claim, or cancel.</p>
          <div className="mt-5">
            <StreamDashboard />
          </div>
        </section>
      </main>

      <footer className="mt-auto border-t border-hairline bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5 text-xs text-muted">
          <span>Built for the Base Builder Quest · Tokenized Stocks · Ends Sep 9, 2026</span>
          <span>
            Docs:{" "}
            <a className="underline underline-offset-2 hover:text-ink" href="https://docs.base.org/base-chain/asset-issuance/tokenized-stocks-on-base">
              Tokenized Stocks on Base
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
