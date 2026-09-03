"use client";
import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseUnits, isAddress } from "viem";
import { B20_TOKENS, B20_ABI, DRIP_VAULT_ABI, DRIP_VAULT_ADDRESS, type B20Symbol } from "@/lib/b20";

export function CreateStream({ onCreated }: { onCreated?: (id: bigint) => void }) {
  const { address } = useAccount();
  const [symbol, setSymbol] = useState<B20Symbol>("AAPLc");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("0.1");
  const [days, setDays] = useState("30");

  const token = B20_TOKENS[symbol];
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  const { data: allowance } = useReadContract({
    address: token.address,
    abi: B20_ABI,
    functionName: "allowance",
    args: address ? [address, DRIP_VAULT_ADDRESS] : undefined,
    query: { enabled: !!address && DRIP_VAULT_ADDRESS !== "0x0000000000000000000000000000000000000000" },
  });

  const handleApprove = () => {
    if (!address) return;
    const amt = parseUnits(amount || "0", 18);
    writeContract({
      address: token.address,
      abi: B20_ABI,
      functionName: "approve",
      args: [DRIP_VAULT_ADDRESS, amt],
    });
  };

  const handleCreate = () => {
    if (!isAddress(recipient)) {
      alert("Enter valid recipient address (0x... or ENS/Base name resolved offchain)");
      return;
    }
    const amt = parseUnits(amount || "0", 18);
    const duration = BigInt(Math.floor(Number(days) * 86400));
    writeContract({
      address: DRIP_VAULT_ADDRESS,
      abi: DRIP_VAULT_ABI,
      functionName: "createStream",
      args: [recipient as `0x${string}`, token.address, amt, duration],
    });
  };

  const needsApprove = allowance !== undefined && parseUnits(amount || "0", 18) > (allowance as bigint);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="text-zinc-500">Token</span>
          <select value={symbol} onChange={(e) => setSymbol(e.target.value as B20Symbol)} className="mt-1 w-full rounded-lg border px-3 py-2 bg-white">
            {Object.keys(B20_TOKENS).map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <span className="text-xs text-zinc-400">{token.address}</span>
        </label>
        <label className="text-sm">
          <span className="text-zinc-500">Amount</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.1" className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
      </div>

      <label className="text-sm block">
        <span className="text-zinc-500">Recipient (wallet / Base name)</span>
        <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="0x... or alice.base.eth" className="mt-1 w-full rounded-lg border px-3 py-2" />
      </label>

      <label className="text-sm block">
        <span className="text-zinc-500">Duration (days)</span>
        <input value={days} onChange={(e) => setDays(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
        <span className="text-xs text-zinc-400">Stream unlocks linearly per second. Withdraw anytime.</span>
      </label>

      {!address ? (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">Connect wallet to create stream</div>
      ) : DRIP_VAULT_ADDRESS === "0x0000000000000000000000000000000000000000" ? (
        <div className="rounded-lg bg-zinc-50 border p-3 text-sm">
          Vault not deployed yet. Set <code>NEXT_PUBLIC_DRIP_VAULT</code> after `forge script --rpc-url baseSepolia`.
          <div className="text-xs text-zinc-500 mt-1">For demo, contracts compile and tests pass. Deploy to Base Sepolia first.</div>
        </div>
      ) : needsApprove ? (
        <button onClick={handleApprove} disabled={isPending} className="w-full rounded-xl bg-black text-white py-3 font-medium disabled:opacity-50">
          {isPending ? "Approving..." : `Approve ${symbol}`}
        </button>
      ) : (
        <button onClick={handleCreate} disabled={isPending} className="w-full rounded-xl bg-[#0052ff] text-white py-3 font-medium disabled:opacity-50">
          {isPending ? "Creating..." : `Stream ${amount} ${symbol}`}
        </button>
      )}

      {hash && <div className="text-xs break-all text-zinc-500">tx: {hash} {isSuccess && "✓"}</div>}
      {error && <div className="text-xs text-red-600">{error.message.slice(0, 300)}</div>}

      <div className="text-xs text-zinc-400 border-t pt-3">
        B20 note: 1 token ≠ 1 share permanently. Multiplier may change on dividends/splits — vault auto-handles via token math. Chainlink feed: {token.chainlinkFeed.slice(0, 10)}…
      </div>
    </div>
  );
}
