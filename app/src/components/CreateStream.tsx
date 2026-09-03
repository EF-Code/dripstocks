"use client";
import { useState } from "react";
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseUnits, isAddress, keccak256, toHex } from "viem";
import { getTokens, B20_ABI, DRIP_VAULT_ABI, getVaultAddress, isTokenConfigured, type B20Symbol } from "@/lib/b20";

type Mode = "direct" | "claimable" | "batch";

function randomSecret(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

export function CreateStream({ onCreated }: { onCreated?: (id: bigint) => void }) {
  const { address } = useAccount();
  const chainId = useChainId();
  const vaultAddress = getVaultAddress(chainId);
  const TOKENS = getTokens(chainId);
  const [mode, setMode] = useState<Mode>("direct");
  const [symbol, setSymbol] = useState<B20Symbol>("AAPLc");
  const [recipient, setRecipient] = useState("");
  const [recipients, setRecipients] = useState("");
  const [secret, setSecret] = useState<`0x${string}` | "">("");
  const [amount, setAmount] = useState("0.1");
  const [days, setDays] = useState("30");

  const token = TOKENS[symbol];
  const tokenReady = isTokenConfigured(token);
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  const recipientList = recipients.split("\n").map((s) => s.trim()).filter(Boolean);
  const batchValid = recipientList.length > 0 && recipientList.every((r) => isAddress(r));
  const totalAmount = mode === "batch"
    ? parseUnits(amount || "0", 18) * BigInt(Math.max(recipientList.length, 1))
    : parseUnits(amount || "0", 18);

  const { data: allowance } = useReadContract({
    address: token.address,
    abi: B20_ABI,
    functionName: "allowance",
    args: address ? [address, vaultAddress] : undefined,
    query: { enabled: !!address && tokenReady && vaultAddress !== "0x0000000000000000000000000000000000000000" },
  });

  const handleApprove = () => {
    if (!address) return;
    writeContract({
      address: token.address,
      abi: B20_ABI,
      functionName: "approve",
      args: [vaultAddress, totalAmount],
    });
  };

  const handleCreate = () => {
    const duration = BigInt(Math.floor(Number(days) * 86400));
    if (mode === "direct") {
      if (!isAddress(recipient)) {
        alert("Enter a 0x recipient address. Base names / ENS are not resolved yet.");
        return;
      }
      const amt = parseUnits(amount || "0", 18);
      writeContract({
        address: vaultAddress,
        abi: DRIP_VAULT_ABI,
        functionName: "createStream",
        args: [recipient as `0x${string}`, token.address, amt, duration],
      });
    } else if (mode === "claimable") {
      if (!secret || secret.length !== 66) {
        alert("Generate a random secret first. The recipient claims with it; share it off-chain only.");
        return;
      }
      const amt = parseUnits(amount || "0", 18);
      const claimHash = keccak256(secret as `0x${string}`);
      writeContract({
        address: vaultAddress,
        abi: DRIP_VAULT_ABI,
        functionName: "createClaimableStream",
        args: [token.address, amt, duration, claimHash],
      });
    } else {
      if (!batchValid) {
        alert("Enter one 0x address per line. Base names / ENS are not resolved yet.");
        return;
      }
      const amt = parseUnits(amount || "0", 18);
      writeContract({
        address: vaultAddress,
        abi: DRIP_VAULT_ABI,
        functionName: "batchCreate",
        args: [recipientList as `0x${string}`[], token.address, amt, duration],
      });
    }
  };

  const needsApprove = allowance !== undefined && totalAmount > (allowance as bigint);
  const canSubmit = tokenReady && vaultAddress !== "0x0000000000000000000000000000000000000000" &&
    (mode === "direct" ? isAddress(recipient) : mode === "claimable" ? secret.length === 66 : batchValid);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["direct", "claimable", "batch"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${mode === m ? "bg-black text-white" : "bg-zinc-100 text-zinc-600"}`}
          >
            {m === "direct" ? "Direct" : m === "claimable" ? "Claim link" : `Batch (${recipientList.length || 0})`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">
          <span className="text-zinc-500">Token {token.mock ? "(Sepolia mock)" : ""}</span>
          <select value={symbol} onChange={(e) => setSymbol(e.target.value as B20Symbol)} className="mt-1 w-full rounded-lg border px-3 py-2 bg-white">
            {Object.keys(TOKENS).map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <span className="text-xs text-zinc-400">{token.address}</span>
        </label>
        <label className="text-sm">
          <span className="text-zinc-500">{mode === "batch" ? "Amount each" : "Amount"}</span>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.1" className="mt-1 w-full rounded-lg border px-3 py-2" />
        </label>
      </div>

      {mode === "direct" && (
        <label className="text-sm block">
          <span className="text-zinc-500">Recipient (wallet address)</span>
          <input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="0x..." className="mt-1 w-full rounded-lg border px-3 py-2" />
          <span className="text-xs text-zinc-400">Base names / ENS are not resolved yet — paste a 0x address.</span>
        </label>
      )}

      {mode === "claimable" && (
        <div className="text-sm space-y-2">
          <span className="text-zinc-500">Claim secret (recipient claims with this)</span>
          <div className="flex gap-2">
            <input value={secret} readOnly placeholder="Generate a secret…" className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-xs" />
            <button onClick={() => setSecret(randomSecret())} className="mt-1 shrink-0 rounded-lg border px-3 py-2 text-xs font-medium">Generate</button>
          </div>
          <span className="text-xs text-zinc-400">256-bit random secret. Share it with the recipient off-chain only — anyone holding it can claim. Never use a raw email address.</span>
        </div>
      )}

      {mode === "batch" && (
        <label className="text-sm block">
          <span className="text-zinc-500">Recipients (one 0x address per line)</span>
          <textarea value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder={"0xabc...\n0xdef..."} rows={4} className="mt-1 w-full rounded-lg border px-3 py-2 font-mono text-xs" />
          <span className="text-xs text-zinc-400">{recipientList.length} recipient(s){recipientList.length > 0 && !batchValid ? " — all lines must be valid 0x addresses" : ""}. Total approval: {totalAmount.toString()} wei.</span>
        </label>
      )}

      <label className="text-sm block">
        <span className="text-zinc-500">Duration (days)</span>
        <input value={days} onChange={(e) => setDays(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2" />
        <span className="text-xs text-zinc-400">Stream unlocks linearly per second. Withdraw anytime.</span>
      </label>

      {!address ? (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">Connect wallet to create stream</div>
      ) : vaultAddress === "0x0000000000000000000000000000000000000000" ? (
        <div className="rounded-lg bg-zinc-50 border p-3 text-sm">
          Vault not deployed yet on this chain. Set <code>NEXT_PUBLIC_DRIP_VAULT_SEPOLIA</code> (84532) or <code>NEXT_PUBLIC_DRIP_VAULT_BASE</code> (8453) after deploying.
        </div>
      ) : !tokenReady ? (
        <div className="rounded-lg bg-zinc-50 border p-3 text-sm">
          {symbol} is not configured on this chain. Set <code>NEXT_PUBLIC_SEPOLIA_{symbol.toUpperCase()}</code> from the DeployTestnet output.
        </div>
      ) : needsApprove ? (
        <button onClick={handleApprove} disabled={isPending} className="w-full rounded-xl bg-black text-white py-3 font-medium disabled:opacity-50">
          {isPending ? "Approving..." : `Approve ${symbol}`}
        </button>
      ) : (
        <button onClick={handleCreate} disabled={isPending || !canSubmit} className="w-full rounded-xl bg-[#0052ff] text-white py-3 font-medium disabled:opacity-50">
          {isPending ? "Creating..." : mode === "direct" ? `Stream ${amount} ${symbol}` : mode === "claimable" ? `Create claim link (${amount} ${symbol})` : `Stream to ${recipientList.length} recipients`}
        </button>
      )}

      {hash && <div className="text-xs break-all text-zinc-500">tx: {hash} {isSuccess && "✓"}</div>}
      {error && <div className="text-xs text-red-600">{error.message.slice(0, 300)}</div>}

      <div className="text-xs text-zinc-400 border-t pt-3">
        B20 note: 1 token ≠ 1 share permanently. Multiplier may change on dividends/splits — the vault settles raw token units. {token.chainlinkFeed ? <>Chainlink feed: {token.chainlinkFeed.slice(0, 10)}…</> : "No price feed on testnet."}
      </div>
    </div>
  );
}
