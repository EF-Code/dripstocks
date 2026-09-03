"use client";
import { useEffect, useState } from "react";
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";
import { DRIP_VAULT_ABI, getVaultAddress } from "@/lib/b20";

function Ticking({ start, end, total, withdrawn }: { start: bigint; end: bigint; total: bigint; withdrawn: bigint }) {
  // NOTE: client-clock estimate via Date.now(). Chain accounting uses
  // block.timestamp, so this display may diverge by seconds/skew — the
  // contract's withdrawable() is the source of truth at withdraw time.
  const [now, setNow] = useState(() => BigInt(Math.floor(Date.now() / 1000)));
  useEffect(() => {
    const id = setInterval(() => setNow(BigInt(Math.floor(Date.now() / 1000))), 1000);
    return () => clearInterval(id);
  }, []);
  const zero = BigInt(0);
  const hundred = BigInt(100);
  const vested = now < start ? zero : now >= end ? total : (total * (now - start)) / (end - start);
  const withdrawable = vested > withdrawn ? vested - withdrawn : zero;
  const pct = total === zero ? 0 : Number((vested * hundred) / total);

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted">Vested</span>
        <span className="font-mono tnum">{formatUnits(vested, 18)} / {formatUnits(total, 18)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full bg-mint transition-[width]" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-muted">Withdrawable</span>
        <span className="font-mono font-semibold text-mintdim tnum">{formatUnits(withdrawable, 18)}</span>
      </div>
      <div className="font-mono text-[10px] text-muted tnum">+{(Number(total) / Number(end - start || BigInt(1)) / 1e18).toExponential(2)}/s</div>
    </div>
  );
}

function StatusChip({ canceled, ended }: { canceled: boolean; ended: boolean }) {
  if (canceled) return <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-semibold text-muted">CANCELED</span>;
  if (ended) return <span className="rounded-full bg-baseblue/10 px-2 py-0.5 text-[10px] font-semibold text-baseblue">FULLY VESTED</span>;
  return (
    <span className="flex items-center gap-1 rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-semibold text-mintdim">
      <span className="live-dot h-1 w-1 animate-livedot rounded-full bg-mint" /> STREAMING
    </span>
  );
}

export function StreamDashboard({ highlightId }: { highlightId?: bigint | null }) {
  const { address } = useAccount();
  const chainId = useChainId();
  const vaultAddress = getVaultAddress(chainId);
  const { data: nextId } = useReadContract({
    address: vaultAddress,
    abi: DRIP_VAULT_ABI,
    functionName: "nextStreamId",
    query: { enabled: vaultAddress !== "0x0000000000000000000000000000000000000000", refetchInterval: 5000 },
  });

  const { writeContract, data: hash } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  const [ids, setIds] = useState<bigint[]>([]);
  useEffect(() => {
    if (nextId !== undefined) {
      const n = Number(nextId);
      // Bounded recent window; per-row filtering below keeps only streams
      // involving the connected wallet (sender or recipient).
      const all = Array.from({ length: Math.min(n, 25) }, (_, i) => BigInt(n - 1 - i));
      setIds(all);
    }
  }, [nextId, isSuccess]);

  if (!address) return <div className="text-sm text-muted">Connect to see streams. Demo uses Base Sepolia → Mainnet B20.</div>;
  if (vaultAddress === "0x0000000000000000000000000000000000000000") {
    return (
      <div className="rounded-xl border border-dashed border-hairline p-6 text-center">
        <div className="text-sm font-semibold">No vault deployed yet</div>
        <div className="mt-1 text-xs text-muted">Deploy <code>DripVault.sol</code> to Base Sepolia:</div>
        <pre className="mt-2 overflow-auto rounded-lg bg-panel p-3 text-left font-mono text-xs text-white">forge script script/DeployTestnet.s.sol --rpc-url $BASE_SEPOLIA_RPC --private-key $PRIVATE_KEY --broadcast</pre>
        <div className="mt-2 text-xs text-muted">Add the address as NEXT_PUBLIC_DRIP_VAULT_SEPOLIA, then redeploy the frontend.</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">Only streams where you are sender or recipient.</p>
      <ClaimPanel vaultAddress={vaultAddress} />
      {ids.length === 0 ? (
        <div className="rounded-xl border border-dashed border-hairline p-6 text-center text-sm text-muted">
          No streams yet. Fund one on the left — it will tick live here.
        </div>
      ) : (
        ids.map((id) => (
          <StreamRow key={id.toString()} id={id} highlight={highlightId === id} connected={address} vaultAddress={vaultAddress} onWithdraw={(sid) => writeContract({ address: vaultAddress, abi: DRIP_VAULT_ABI, functionName: "withdraw", args: [sid] })} onCancel={(sid) => writeContract({ address: vaultAddress, abi: DRIP_VAULT_ABI, functionName: "cancel", args: [sid] })} />
        ))
      )}
      {hash && <div className="break-all font-mono text-xs text-muted tnum">tx: {hash}</div>}
    </div>
  );
}

function ClaimPanel({ vaultAddress }: { vaultAddress: `0x${string}` }) {
  const [streamId, setStreamId] = useState("");
  const [secret, setSecret] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const { writeContract, data: hash, isPending } = useWriteContract();
  const handleClaim = () => {
    setFormError(null);
    if (!/^\d+$/.test(streamId.trim())) {
      setFormError("Enter a numeric stream ID.");
      return;
    }
    if (!/^0x[0-9a-fA-F]{64}$/.test(secret.trim())) {
      setFormError("Enter the 32-byte claim secret (0x plus 64 hex characters) shared with you off-chain.");
      return;
    }
    writeContract({
      address: vaultAddress,
      abi: DRIP_VAULT_ABI,
      functionName: "claim",
      args: [BigInt(streamId.trim()), secret.trim() as `0x${string}`],
    });
  };
  return (
    <div className="space-y-2 rounded-xl border border-dashed border-hairline p-4">
      <div className="text-xs font-semibold">Claim a stream with a secret</div>
      <div className="flex gap-2">
        <input value={streamId} onChange={(e) => { setStreamId(e.target.value); setFormError(null); }} placeholder="ID" aria-label="Stream ID" inputMode="numeric" className="w-20 rounded-lg border border-hairline bg-white px-2 py-1.5 font-mono text-xs outline-none focus:border-baseblue" />
        <input value={secret} onChange={(e) => { setSecret(e.target.value); setFormError(null); }} placeholder="0x secret…" aria-label="Claim secret" className="min-w-0 flex-1 rounded-lg border border-hairline bg-white px-2 py-1.5 font-mono text-xs outline-none focus:border-baseblue" />
        <button onClick={handleClaim} disabled={isPending} className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Claim</button>
      </div>
      {formError && <div role="alert" className="text-xs text-danger">{formError}</div>}
      {hash && <div className="break-all font-mono text-xs text-muted tnum">tx: {hash}</div>}
    </div>
  );
}

function StreamRow({ id, highlight, connected, vaultAddress, onWithdraw, onCancel }: { id: bigint; highlight?: boolean; connected?: string; vaultAddress: `0x${string}`; onWithdraw: (id: bigint) => void; onCancel: (id: bigint) => void }) {
  const { address: connectedNow } = useAccount();
  const me = connected ?? connectedNow;
  const [confirming, setConfirming] = useState(false);
  const { data } = useReadContract({
    address: vaultAddress,
    abi: DRIP_VAULT_ABI,
    functionName: "streams",
    args: [id],
    query: { refetchInterval: 3000 },
  });

  if (!data) return <div className="h-24 animate-pulse rounded-xl bg-ink/5" />;
  const [sender, recipient, token, total, withdrawn, start, end, canceled] = data as unknown as [string, string, string, bigint, bigint, bigint, bigint, boolean, string];

  // Filter to streams involving the connected wallet (sender or recipient).
  // Claimable-but-unclaimed rows have recipient == zero address: only the
  // sender sees them until claimed.
  if (me && sender.toLowerCase() !== me.toLowerCase() && recipient.toLowerCase() !== me.toLowerCase()) {
    return null;
  }

  const isRecipient = !!me && recipient.toLowerCase() === me.toLowerCase();
  const isSender = !!me && sender.toLowerCase() === me.toLowerCase();
  const ended = BigInt(Math.floor(Date.now() / 1000)) >= end;

  return (
    <div className={`rounded-xl border border-hairline bg-white p-4 ${highlight ? "ring-2 ring-baseblue" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted tnum">#{id.toString()}</span>
            <StatusChip canceled={canceled} ended={ended} />
          </div>
          <div className="mt-1 font-mono text-xs tnum">{sender.slice(0, 6)}… → {recipient.slice(0, 6)}… · {token.slice(0, 6)}…{token.slice(-4)}</div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => onWithdraw(id)}
            disabled={!isRecipient}
            title={isRecipient ? "Withdraw vested amount" : "Only the recipient can withdraw (the contract reverts otherwise)"}
            className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            Withdraw
          </button>
          {isSender && !canceled && (
            confirming ? (
              <button
                onClick={() => { setConfirming(false); onCancel(id); }}
                onBlur={() => setConfirming(false)}
                title="Confirm: refunds unvested to you and freezes vesting"
                className="rounded-full bg-danger px-3 py-1.5 text-xs font-semibold text-white"
              >
                Confirm cancel?
              </button>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                title="Cancel stream: refunds unvested to you, freezes vesting"
                className="rounded-full border border-hairline px-3 py-1.5 text-xs font-semibold hover:border-danger hover:text-danger"
              >
                Cancel
              </button>
            )
          )}
        </div>
      </div>
      <div className="mt-3">
        <Ticking start={start} end={end} total={total} withdrawn={withdrawn} />
      </div>
    </div>
  );
}
