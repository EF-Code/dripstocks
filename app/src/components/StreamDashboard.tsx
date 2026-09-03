"use client";
import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits } from "viem";
import { DRIP_VAULT_ABI, DRIP_VAULT_ADDRESS } from "@/lib/b20";

function Ticking({ start, end, total, withdrawn }: { start: bigint; end: bigint; total: bigint; withdrawn: bigint }) {
  const [now, setNow] = useState(() => BigInt(Math.floor(Date.now() / 1000)));
  useEffect(() => {
    const id = setInterval(() => setNow(BigInt(Math.floor(Date.now() / 1000))), 1000);
    return () => clearInterval(id);
  }, []);
  const zero = BigInt(0);
  const hundred = BigInt(100);
  const one = BigInt(1);
  const vested = now < start ? zero : now >= end ? total : (total * (now - start)) / (end - start);
  const withdrawable = vested > withdrawn ? vested - withdrawn : zero;
  const pct = total === zero ? 0 : Number((vested * hundred) / total);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs"><span className="text-zinc-500">Vested</span><span className="font-mono">{formatUnits(vested, 18)} / {formatUnits(total, 18)}</span></div>
      <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
      <div className="flex justify-between text-xs"><span className="text-zinc-500">Withdrawable</span><span className="font-mono text-emerald-600">{formatUnits(withdrawable, 18)}</span></div>
      <div className="text-[10px] text-zinc-400">+ {(Number(total) / Number(end - start || BigInt(1)) / 1e18).toExponential(2)}/s</div>
    </div>
  );
}

export function StreamDashboard({ highlightId }: { highlightId?: bigint | null }) {
  const { address } = useAccount();
  const { data: nextId } = useReadContract({
    address: DRIP_VAULT_ADDRESS,
    abi: DRIP_VAULT_ABI,
    functionName: "nextStreamId",
    query: { enabled: DRIP_VAULT_ADDRESS !== "0x0000000000000000000000000000000000000000", refetchInterval: 5000 },
  });

  const { writeContract, data: hash } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  const [ids, setIds] = useState<bigint[]>([]);
  useEffect(() => {
    if (nextId !== undefined) {
      const n = Number(nextId);
      const all = Array.from({ length: Math.min(n, 6) }, (_, i) => BigInt(i));
      setIds(all.reverse());
    }
  }, [nextId, isSuccess]);

  if (!address) return <div className="text-sm text-zinc-500">Connect to see streams. Demo uses Base Sepolia → Mainnet B20.</div>;
  if (DRIP_VAULT_ADDRESS === "0x0000000000000000000000000000000000000000") {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center">
        <div className="text-sm font-medium">No vault deployed yet</div>
        <div className="text-xs text-zinc-500 mt-1">Deploy <code>DripVault.sol</code> to Base Sepolia:</div>
        <pre className="mt-2 text-xs bg-zinc-950 text-zinc-100 p-3 rounded-lg overflow-auto text-left">forge script script/Deploy.s.sol --rpc-url $BASE_SEPOLIA_RPC --private-key $PRIVATE_KEY --broadcast</pre>
        <div className="text-xs text-zinc-400 mt-2">Add address to app/.env as NEXT_PUBLIC_DRIP_VAULT, then Vercel deploy = Live Project Link for form.</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {ids.length === 0 ? (
        <div className="text-sm text-zinc-500">No streams yet. Create one → it will tick live here.</div>
      ) : (
        ids.map((id) => (
          <StreamRow key={id.toString()} id={id} highlight={highlightId === id} onWithdraw={(sid) => writeContract({ address: DRIP_VAULT_ADDRESS, abi: DRIP_VAULT_ABI, functionName: "withdraw", args: [sid] })} />
        ))
      )}
      {hash && <div className="text-xs break-all text-zinc-500">tx: {hash}</div>}
    </div>
  );
}

function StreamRow({ id, highlight, onWithdraw }: { id: bigint; highlight?: boolean; onWithdraw: (id: bigint) => void }) {
  const { data } = useReadContract({
    address: DRIP_VAULT_ADDRESS,
    abi: DRIP_VAULT_ABI,
    functionName: "streams",
    args: [id],
    query: { refetchInterval: 3000 },
  });

  if (!data) return <div className="h-24 animate-pulse bg-zinc-50 rounded-xl" />;
  const [sender, recipient, token, total, withdrawn, start, end] = data as unknown as [string, string, string, bigint, bigint, bigint, bigint, boolean, string];

  return (
    <div className={`rounded-xl border p-4 ${highlight ? "ring-2 ring-[#0052ff] border-[#0052ff]" : ""}`}>
      <div className="flex justify-between items-start">
        <div>
          <div className="text-xs text-zinc-500">Stream #{id.toString()} • {token.slice(0, 6)}…{token.slice(-4)}</div>
          <div className="text-xs">from {sender.slice(0, 6)}… → {recipient.slice(0, 6)}…</div>
        </div>
        <button onClick={() => onWithdraw(id)} className="rounded-full bg-black text-white px-3 py-1 text-xs">Withdraw</button>
      </div>
      <div className="mt-3">
        <Ticking start={start} end={end} total={total} withdrawn={withdrawn} />
      </div>
      <div className="mt-2 text-[10px] text-zinc-400">Use withdrawable as Aave collateral on Base (read health factor offchain).</div>
    </div>
  );
}
