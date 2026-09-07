"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { WALLET_CONNECT_READY } from "@/lib/wagmi";

export function WalletButton() {
  const { address, isConnected, isReconnecting, isConnecting } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);

  if (isReconnecting || isConnecting || isPending) {
    return <button disabled className="rounded-full bg-ink px-4 py-2 text-sm text-white">{isReconnecting ? "Reconnecting…" : "Connecting…"}</button>;
  }
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
      <button onClick={() => setOpen((value) => !value)} aria-haspopup="menu" aria-expanded={open} className="whitespace-nowrap rounded-full bg-baseblue px-4 py-2 text-sm font-semibold text-white hover:bg-basedark sm:px-5">
        Connect wallet
      </button>
      {open && (
        <>
          <button aria-hidden tabIndex={-1} onClick={() => setOpen(false)} className="fixed inset-0 cursor-default" />
          <div role="menu" aria-label="Choose a wallet" className="absolute right-0 z-20 mt-2 w-64 rounded-2xl border border-hairline bg-card p-2 shadow-xl">
            {connectors.map((connector) => (
              <button key={connector.uid} role="menuitem" disabled={isPending} onClick={() => { setOpen(false); connect({ connector }); }} className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium hover:bg-paper disabled:opacity-50">
                <span>{connector.name === "Injected" ? "Browser wallet" : connector.name}</span>
                <span className="text-xs text-muted">{connector.id === "walletConnect" ? "QR code" : connector.id === "coinbaseWalletSDK" ? "Smart Wallet" : "Extension"}</span>
              </button>
            ))}
            {!WALLET_CONNECT_READY && <div className="rounded-xl px-3 py-2.5 text-xs text-muted">WalletConnect QR appears here once a project ID is configured.</div>}
          </div>
        </>
      )}
      {error && <div role="alert" className="mt-2 max-w-64 text-xs text-danger">Connection failed. Check your wallet, then choose a connector to retry.</div>}
    </div>
  );
}

export function ChainBanner() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending, error } = useSwitchChain();
  if (!isConnected || chainId === baseSepolia.id) return null;
  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-2.5 text-sm">
        <span className="font-medium">Unsupported network.</span>
        <span className="text-muted">DripStocks runs on Base Sepolia (testnet).</span>
        <button onClick={() => switchChain({ chainId: baseSepolia.id })} disabled={isPending} className="rounded-full bg-ink px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
          {isPending ? "Switching…" : "Switch to Base Sepolia"}
        </button>
        {error && <span role="alert">Network switch failed. Switch to Base Sepolia in your wallet.</span>}
      </div>
    </div>
  );
}
