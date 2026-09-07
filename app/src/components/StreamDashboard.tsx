"use client";
import { useEffect, useRef, useState } from "react";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { encodeAbiParameters, formatUnits, keccak256, maxUint256, zeroAddress, type Hex } from "viem";
import { DRIP_CHAIN_ID, DRIP_VAULT_ABI, getVaultAddress } from "@/lib/b20";
import { describeTransactionError } from "@/lib/transaction";

export function parseStreamId(value: string): bigint | null {
  if (!/^\d{1,78}$/.test(value.trim())) return null;
  const id = BigInt(value.trim());
  return id <= maxUint256 ? id : null;
}

function useVaultTransaction(vault: Hex, chainId: typeof DRIP_CHAIN_ID) {
  const { address, chainId: walletChain, status } = useAccount();
  const client = usePublicClient({ chainId });
  const { writeContractAsync } = useWriteContract();
  const queries = useQueryClient();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [hash, setHash] = useState<Hex>();
  const [error, setError] = useState<string>();
  const [confirmed, setConfirmed] = useState(false);
  const send = async (functionName: "withdraw" | "cancel" | "claim" | "commitClaim", args: readonly [bigint] | readonly [bigint, Hex]) => {
    if (lock.current || !client || !address || status !== "connected" || walletChain !== chainId || vault === zeroAddress) return false;
    lock.current = true; setBusy(true); setError(undefined); setHash(undefined); setConfirmed(false);
    try {
      await client.simulateContract({ address: vault, abi: DRIP_VAULT_ABI, functionName, args, account: address });
      const tx = await writeContractAsync({ address: vault, abi: DRIP_VAULT_ABI, functionName, args, account: address, chainId });
      setHash(tx);
      const receipt = await client.waitForTransactionReceipt({ hash: tx, confirmations: functionName === "commitClaim" ? 2 : 1 });
      if (receipt.status !== "success") throw new Error("reverted");
      setConfirmed(true);
      await queries.invalidateQueries({ queryKey: ["readContract"] });
      return true;
    } catch (e) { setError(describeTransactionError(e)); return false; }
    finally { lock.current = false; setBusy(false); }
  };
  return { send, busy, hash, error, confirmed };
}

function TransactionStatus({ hash, busy, confirmed, error }: { hash?: Hex; busy: boolean; confirmed: boolean; error?: string }) {
  return <>
    {busy && <p role="status" className="text-xs text-muted">{hash ? "Waiting for confirmation…" : "Check your wallet…"}</p>}
    {hash && <p className="break-all font-mono text-xs text-muted">tx: {hash}{confirmed && " ✓ confirmed"}</p>}
    {error && <p role="alert" className="text-xs text-danger">{error}</p>}
  </>;
}

export function StreamDashboard({ highlightId, vaultAddress, claimsEnabled = true }: { highlightId?: bigint | null; vaultAddress?: Hex; claimsEnabled?: boolean }) {
  const { address, chainId: walletChain, status } = useAccount();
  const chainId = DRIP_CHAIN_ID;
  if (status === "reconnecting" || status === "connecting") return <p>Restoring wallet connection…</p>;
  if (!address) return <div className="text-sm text-muted">Connect to see streams. Demo runs on Base Sepolia with mock tokens.</div>;
  if (walletChain !== chainId) return <p role="alert">Switch your wallet to Base Sepolia to manage streams.</p>;
  const vault = vaultAddress ?? getVaultAddress(chainId);
  if (vault === zeroAddress) return <p>No vault configured on this network.</p>;
  return <Dashboard key={`${chainId}:${vault}:${address}`} address={address} chainId={chainId} vault={vault} highlightId={highlightId} claimsEnabled={claimsEnabled} />;
}

function Dashboard({ address, chainId, vault, highlightId, claimsEnabled }: { address: Hex; chainId: typeof DRIP_CHAIN_ID; vault: Hex; highlightId?: bigint | null; claimsEnabled: boolean }) {
  const { data: nextId, isError, refetch } = useReadContract({ address: vault, abi: DRIP_VAULT_ABI, functionName: "nextStreamId", chainId, query: { refetchInterval: 5000 } });
  const [cursor, setCursor] = useState<bigint | null>(null);
  const [lookup, setLookup] = useState("");
  const [selected, setSelected] = useState<bigint | null>(highlightId ?? null);
  const [lookupError, setLookupError] = useState("");
  const end = cursor ?? nextId ?? 0n;
  const start = end > 25n ? end - 25n : 0n;
  const ids = Array.from({ length: Number(end - start) }, (_, i) => end - 1n - BigInt(i));
  return <div className="space-y-3">
    <p className="text-xs text-muted">Only streams where you are sender or recipient. Browse older pages or look up any stream by ID.</p>
    {claimsEnabled && <ClaimPanel vault={vault} chainId={chainId} address={address} />}
    <form className="flex gap-2" onSubmit={(e) => {
      e.preventDefault(); const id = parseStreamId(lookup);
      if (id === null) { setLookupError("Enter a valid stream ID."); return; }
      setLookupError(""); setSelected(id);
    }}>
      <input aria-label="Find stream ID" value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="Stream ID" className="min-w-0 flex-1 rounded-lg border border-hairline px-2 py-1 text-sm" />
      <button className="rounded-full border border-hairline px-3 py-1 text-sm">Find stream</button>
    </form>
    {lookupError && <p role="alert">{lookupError}</p>}
    {selected !== null && <div className="space-y-2 rounded-xl border border-baseblue p-2">
      <StreamRow id={selected} vault={vault} chainId={chainId} connected={address} explicit />
      <button onClick={() => setSelected(null)} className="text-xs underline">Close lookup</button>
    </div>}
    {isError ? <p role="alert">Could not load streams. <button onClick={() => refetch()} className="underline">Retry</button></p>
      : nextId === undefined ? <p role="status">Loading streams…</p>
      : nextId === 0n ? <p>No streams yet. Create one to get started.</p>
      : <>
        <p className="text-xs text-muted">Checking IDs {start.toString()}–{(end - 1n).toString()}. If none belong to you, try an older page.</p>
        {ids.map((id) => <StreamRow key={id.toString()} id={id} vault={vault} chainId={chainId} connected={address} />)}
        <div className="flex justify-between">
          <button disabled={cursor === null} onClick={() => setCursor(null)} className="text-sm underline disabled:opacity-40">Latest streams</button>
          <button disabled={start === 0n} onClick={() => setCursor(start)} className="text-sm underline disabled:opacity-40">Older streams</button>
        </div>
      </>}
  </div>;
}

function ClaimPanel({ vault, chainId, address }: { vault: Hex; chainId: typeof DRIP_CHAIN_ID; address: Hex }) {
  const [streamId, setStreamId] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [prepared, setPrepared] = useState<string>();
  const tx = useVaultTransaction(vault, chainId);
  const { data: protocol, isPending } = useReadContract({ address: vault, abi: DRIP_VAULT_ABI, functionName: "claimProtocolVersion", chainId, query: { retry: false } });
  const fingerprint = `${address}:${streamId.trim()}:${secret.trim()}`;
  const ready = prepared === fingerprint;
  const submit = async () => {
    setError(""); const id = parseStreamId(streamId);
    if (id === null) { setError("Enter a valid stream ID."); return; }
    if (!/^0x[0-9a-fA-F]{64}$/.test(secret.trim())) { setError("Enter the 32-byte secret shared privately with you."); return; }
    if (protocol !== 2n) return;
    const preimage = secret.trim() as Hex;
    if (!ready) {
      const commitment = keccak256(encodeAbiParameters(
        [{ type: "address" }, { type: "uint256" }, { type: "uint256" }, { type: "address" }, { type: "bytes" }],
        [vault, BigInt(chainId), id, address, preimage],
      ));
      if (await tx.send("commitClaim", [id, commitment])) setPrepared(fingerprint);
    } else if (await tx.send("claim", [id, preimage])) { setSecret(""); setPrepared(undefined); }
  };
  return <div className="space-y-2 rounded-xl border border-dashed border-hairline p-4">
    <p className="text-xs font-semibold">Claim a stream with a secret</p>
    {protocol !== 2n && <p role="status" className="text-xs text-muted">{isPending ? "Checking claim support…" : "Secure claims require the updated vault. Claims are disabled on this legacy deployment; existing direct withdrawals and cancellation remain available."}</p>}
    <fieldset disabled={tx.busy || protocol !== 2n} className="flex gap-2 disabled:opacity-50">
      <input value={streamId} onChange={(e) => { setStreamId(e.target.value); setPrepared(undefined); }} aria-label="Claim stream ID" placeholder="ID" className="w-20 rounded-lg border px-2 py-1 text-xs" />
      <input type="password" autoComplete="off" value={secret} onChange={(e) => { setSecret(e.target.value); setPrepared(undefined); }} aria-label="Claim secret" placeholder="Secret" className="min-w-0 flex-1 rounded-lg border px-2 py-1 text-xs" />
      <button onClick={submit} className="rounded-full bg-ink px-3 py-1 text-xs text-white">{ready ? "Claim" : "Prepare claim"}</button>
    </fieldset>
    <p className="text-xs text-muted">Prepare first, then claim after confirmation. This binds the claim to your wallet before revealing the secret.</p>
    {error && <p role="alert">{error}</p>}
    <TransactionStatus {...tx} />
  </div>;
}

function StreamRow({ id, vault, chainId, connected, explicit }: { id: bigint; vault: Hex; chainId: typeof DRIP_CHAIN_ID; connected: Hex; explicit?: boolean }) {
  const { data, isError } = useReadContract({ address: vault, abi: DRIP_VAULT_ABI, functionName: "streams", args: [id], chainId, query: { refetchInterval: 3000 } });
  const tx = useVaultTransaction(vault, chainId);
  const [confirming, setConfirming] = useState(false);
  if (isError) return <p role="alert">Unable to read stream #{id.toString()}.</p>;
  if (!data) return <p role="status">Loading #{id.toString()}…</p>;
  const [sender, recipient, token, total, withdrawn, start, end, canceled] = data;
  if (sender === zeroAddress) return explicit ? <p>No stream with that ID.</p> : null;
  const isSender = sender.toLowerCase() === connected.toLowerCase();
  const isRecipient = recipient.toLowerCase() === connected.toLowerCase();
  if (!isSender && !isRecipient) return explicit ? <p>This stream belongs to another wallet.</p> : null;
  return <div className="space-y-3 rounded-xl border border-hairline bg-white p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="font-mono text-xs">#{id.toString()} · {canceled ? "CANCELED" : "STREAM"}<br />{sender.slice(0, 6)}… → {recipient.slice(0, 6)}… · {token.slice(0, 6)}…{token.slice(-4)}</div>
      <div className="flex gap-2">
        <button disabled={!isRecipient || tx.busy || withdrawn >= total} onClick={() => tx.send("withdraw", [id])} className="rounded-full bg-ink px-3 py-1 text-xs text-white disabled:opacity-40">Withdraw</button>
        {isSender && !canceled && <button disabled={tx.busy} onClick={() => { if (confirming) { setConfirming(false); void tx.send("cancel", [id]); } else setConfirming(true); }} className="rounded-full border px-3 py-1 text-xs disabled:opacity-40">{confirming ? "Confirm cancel?" : "Cancel"}</button>}
      </div>
    </div>
    <Ticking start={start} end={end} total={total} withdrawn={withdrawn} canceled={canceled} />
    <TransactionStatus {...tx} />
  </div>;
}

function Ticking({ start, end, total, withdrawn, canceled }: { start: bigint; end: bigint; total: bigint; withdrawn: bigint; canceled: boolean }) {
  const [now, setNow] = useState(() => BigInt(Math.floor(Date.now() / 1000)));
  useEffect(() => { const timer = setInterval(() => setNow(BigInt(Math.floor(Date.now() / 1000))), 1000); return () => clearInterval(timer); }, []);
  const vested = canceled || now >= end ? total : now <= start ? 0n : total * (now - start) / (end - start);
  const available = vested > withdrawn ? vested - withdrawn : 0n;
  const pct = total ? Number(vested * 100n / total) : 0;
  return <div className="space-y-2 text-xs">
    <div className="flex justify-between"><span>Vested (estimate)</span><span className="font-mono">{formatUnits(vested, 18)} / {formatUnits(total, 18)}</span></div>
    <div className="h-1.5 rounded-full bg-ink/10"><div className="h-full rounded-full bg-mint" style={{ width: `${pct}%` }} /></div>
    <div className="flex justify-between"><span>Withdrawable (estimate)</span><span className="font-mono">{formatUnits(available, 18)}</span></div>
    <p className="text-muted">{canceled ? "Vesting stopped at cancellation." : now >= end ? "Fully vested." : "Vests each second. Final withdrawal uses chain time."}</p>
  </div>;
}
