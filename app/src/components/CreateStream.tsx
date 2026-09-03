"use client";
import { useState } from "react";
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseUnits, isAddress, keccak256, toHex, formatUnits } from "viem";
import { getTokens, B20_ABI, DRIP_VAULT_ABI, getVaultAddress, isTokenConfigured, type B20Symbol } from "@/lib/b20";

type Mode = "direct" | "claimable" | "batch";

const ZERO = "0x0000000000000000000000000000000000000000";

function randomSecret(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

const inputCls = "mt-1 w-full rounded-xl border border-hairline bg-white px-3 py-2.5 text-sm outline-none placeholder:text-muted/60 focus:border-baseblue";
const labelCls = "text-sm";
const hintCls = "text-xs text-muted";

export function CreateStream() {
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
  const [formError, setFormError] = useState<string | null>(null);

  const token = TOKENS[symbol];
  const tokenReady = isTokenConfigured(token);
  const vaultReady = vaultAddress !== ZERO;
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  const recipientList = recipients.split("\n").map((s) => s.trim()).filter(Boolean);
  const batchValid = recipientList.length > 0 && recipientList.length <= 50 && recipientList.every((r) => isAddress(r));

  const parsedAmount = Number(amount);
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const parsedDays = Number(days);
  const durationSecs = Number.isFinite(parsedDays) && parsedDays > 0 ? Math.floor(parsedDays * 86400) : 0;
  const durationValid = durationSecs >= 60;

  const totalAmount = mode === "batch"
    ? (amountValid ? parseUnits(amount, 18) * BigInt(Math.max(recipientList.length, 1)) : BigInt(0))
    : (amountValid ? parseUnits(amount, 18) : BigInt(0));

  const { data: allowance } = useReadContract({
    address: token.address,
    abi: B20_ABI,
    functionName: "allowance",
    args: address ? [address, vaultAddress] : undefined,
    query: { enabled: !!address && tokenReady && vaultReady },
  });

  const fail = (msg: string) => setFormError(msg);

  const handleApprove = () => {
    if (!address || totalAmount === BigInt(0)) return;
    setFormError(null);
    writeContract({
      address: token.address,
      abi: B20_ABI,
      functionName: "approve",
      args: [vaultAddress, totalAmount],
    });
  };

  const handleCreate = () => {
    setFormError(null);
    if (!amountValid) return fail("Enter an amount greater than zero.");
    if (!durationValid) return fail("Enter a duration of at least 1 minute (0.0007 days).");
    const duration = BigInt(durationSecs);
    if (mode === "direct") {
      if (!isAddress(recipient)) return fail("Enter a valid 0x recipient address. Base names and ENS are not resolved yet.");
      writeContract({
        address: vaultAddress,
        abi: DRIP_VAULT_ABI,
        functionName: "createStream",
        args: [recipient as `0x${string}`, token.address, parseUnits(amount, 18), duration],
      });
    } else if (mode === "claimable") {
      if (!secret || secret.length !== 66) return fail("Generate a random secret first — the recipient needs it to claim.");
      const claimHash = keccak256(secret as `0x${string}`);
      writeContract({
        address: vaultAddress,
        abi: DRIP_VAULT_ABI,
        functionName: "createClaimableStream",
        args: [token.address, parseUnits(amount, 18), duration, claimHash],
      });
    } else {
      if (recipientList.length === 0) return fail("Enter at least one recipient address.");
      if (recipientList.length > 50) return fail("Batch is limited to 50 recipients per transaction — split into smaller batches.");
      if (!batchValid) return fail("Every line must be a valid 0x address. Base names and ENS are not resolved yet.");
      writeContract({
        address: vaultAddress,
        abi: DRIP_VAULT_ABI,
        functionName: "batchCreate",
        args: [recipientList as `0x${string}`[], token.address, parseUnits(amount, 18), duration],
      });
    }
  };

  const needsApprove = allowance !== undefined && totalAmount > (allowance as bigint);
  const ready = !!address && tokenReady && vaultReady && amountValid && durationValid &&
    (mode === "direct" ? isAddress(recipient) : mode === "claimable" ? secret.length === 66 : batchValid);

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Stream type" className="flex gap-1 rounded-full border border-hairline bg-paper p-1">
        {(["direct", "claimable", "batch"] as Mode[]).map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => { setMode(m); setFormError(null); }}
            className={`flex-1 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${mode === m ? "bg-ink text-white" : "text-muted hover:text-ink"}`}
          >
            {m === "direct" ? "Direct" : m === "claimable" ? "Claim link" : `Batch${recipientList.length > 0 ? ` (${recipientList.length})` : ""}`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className={labelCls}>
          <span className="font-medium">Token {token.mock && <span className="text-muted">· Sepolia mock</span>}</span>
          <select value={symbol} onChange={(e) => setSymbol(e.target.value as B20Symbol)} className={inputCls}>
            {Object.keys(TOKENS).map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
          <span className="font-mono text-[11px] text-muted">{token.address.slice(0, 10)}…{token.address.slice(-6)}</span>
        </label>
        <label className={labelCls}>
          <span className="font-medium">{mode === "batch" ? "Amount each" : "Amount"}</span>
          <input value={amount} onChange={(e) => { setAmount(e.target.value); setFormError(null); }} placeholder="0.1" inputMode="decimal" className={inputCls} />
        </label>
      </div>

      {mode === "direct" && (
        <label className={`${labelCls} block`}>
          <span className="font-medium">Recipient wallet</span>
          <input value={recipient} onChange={(e) => { setRecipient(e.target.value); setFormError(null); }} placeholder="0x…" className={`${inputCls} font-mono`} />
          <span className={hintCls}>Base names and ENS are not resolved yet — paste a 0x address.</span>
        </label>
      )}

      {mode === "claimable" && (
        <div className="space-y-2 text-sm">
          <span className="font-medium">Claim secret</span>
          <div className="flex gap-2">
            <input value={secret} readOnly placeholder="Generate a secret…" aria-label="Claim secret" className={`${inputCls} mt-0 font-mono text-xs`} />
            <button onClick={() => { setSecret(randomSecret()); setFormError(null); }} className="shrink-0 rounded-xl border border-hairline bg-white px-3 py-2 text-xs font-semibold hover:border-ink">Generate</button>
          </div>
          <span className={hintCls}>Share it with the recipient off-chain only — anyone holding it can claim. Never use a raw email address.</span>
        </div>
      )}

      {mode === "batch" && (
        <label className={`${labelCls} block`}>
          <span className="font-medium">Recipients <span className="text-muted">· one 0x address per line, max 50</span></span>
          <textarea value={recipients} onChange={(e) => { setRecipients(e.target.value); setFormError(null); }} placeholder={"0xabc…\n0xdef…"} rows={4} className={`${inputCls} font-mono text-xs`} />
          <span className={hintCls}>
            {recipientList.length === 0
              ? "Paste the payroll list."
              : `${recipientList.length} recipient(s) · total ${formatUnits(totalAmount, 18)} ${symbol}.`}
          </span>
        </label>
      )}

      <label className={`${labelCls} block`}>
        <span className="font-medium">Duration (days)</span>
        <input value={days} onChange={(e) => { setDays(e.target.value); setFormError(null); }} placeholder="30" inputMode="decimal" className={inputCls} />
        <span className={hintCls}>Unlocks linearly per second, minimum 1 minute. Withdraw anytime.</span>
      </label>

      {formError && (
        <div role="alert" className="rounded-xl border border-danger/30 bg-red-50 p-3 text-sm text-danger">{formError}</div>
      )}

      {!address ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Connect a wallet to create a stream.</div>
      ) : !vaultReady ? (
        <div className="rounded-xl border border-hairline bg-paper p-3 text-sm">
          Vault not deployed on this chain yet. Switch to a supported network to continue.
        </div>
      ) : !tokenReady ? (
        <div className="rounded-xl border border-hairline bg-paper p-3 text-sm">
          {symbol} is not configured on this chain yet — the deployer still needs to register its address.
        </div>
      ) : needsApprove ? (
        <button onClick={handleApprove} disabled={isPending} className="w-full rounded-xl bg-ink py-3 text-sm font-semibold text-white disabled:opacity-50">
          {isPending ? "Approving…" : `Approve ${formatUnits(totalAmount, 18)} ${symbol}`}
        </button>
      ) : (
        <button onClick={handleCreate} disabled={isPending || !ready} className="w-full rounded-xl bg-baseblue py-3 text-sm font-semibold text-white hover:bg-basedark disabled:opacity-50">
          {isPending ? "Creating…" : mode === "direct" ? `Stream ${amount} ${symbol}` : mode === "claimable" ? `Create claim link` : `Stream to ${recipientList.length} recipients`}
        </button>
      )}

      {hash && <div className="break-all font-mono text-xs text-muted tnum">tx: {hash} {isSuccess && "✓ confirmed"}</div>}
      {error && <div role="alert" className="text-xs text-danger">{error.message.slice(0, 300)}</div>}

      <p className="border-t border-hairline pt-3 text-xs leading-relaxed text-muted">
        Settles in raw token units — 1 token ≠ 1 share across corporate actions. {token.chainlinkFeed ? "Prices are reference only; the vault uses no oracle." : "No price feed on testnet."}
      </p>
    </div>
  );
}
