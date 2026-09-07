"use client";
import { useRef, useState } from "react";
import { useAccount, usePublicClient, useWriteContract, useReadContract } from "wagmi";
import { isAddress, keccak256, toHex, formatUnits, maxUint256, decodeEventLog, type Hex } from "viem";
import { getTokens, B20_ABI, DRIP_CHAIN_ID, DRIP_VAULT_ABI, getVaultAddress, isTokenConfigured, type B20Symbol } from "@/lib/b20";
import { parseAmount, parseDuration } from "@/lib/stream-input";
import { describeTransactionError } from "@/lib/transaction";

type Mode = "direct" | "claimable" | "batch";
const ZERO = "0x0000000000000000000000000000000000000000";
function randomSecret(): Hex { return toHex(crypto.getRandomValues(new Uint8Array(32))); }
const inputCls = "mt-1 w-full rounded-xl border border-hairline bg-white px-3 py-2.5 text-sm outline-none placeholder:text-muted/60 focus:border-baseblue";
const labelCls = "text-sm";
const hintCls = "text-xs text-muted";

export function CreateStream() {
  const { address, chainId: walletChain, status } = useAccount();
  const chainId = DRIP_CHAIN_ID;
  const client = usePublicClient({ chainId });
  const vaultAddress = getVaultAddress(chainId);
  const TOKENS = getTokens(chainId);
  const [mode, setMode] = useState<Mode>("direct");
  const [symbol, setSymbol] = useState<B20Symbol>("AAPLc");
  const [recipient, setRecipient] = useState("");
  const [recipients, setRecipients] = useState("");
  const [secret, setSecret] = useState<Hex | "">("");
  const [amount, setAmount] = useState("0.1");
  const [durationValue, setDurationValue] = useState("30");
  const [durationUnit, setDurationUnit] = useState<"minutes" | "hours" | "days" | "weeks">("days");
  const [formError, setFormError] = useState<string | null>(null);
  const [hash, setHash] = useState<Hex>();
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [createdClaim, setCreatedClaim] = useState<{ secret: Hex; ids: string[] }>();
  const lock = useRef(false);
  const { writeContractAsync } = useWriteContract();
  const token = TOKENS[symbol];
  const tokenReady = isTokenConfigured(token);
  const vaultReady = vaultAddress !== ZERO;
  const connected = status === "connected" && walletChain === chainId && !!address;
  const recipientList = recipients.split("\n").map((s) => s.trim()).filter(Boolean);
  const validRecipient = (r: string) => isAddress(r) && r.toLowerCase() !== ZERO;
  const batchValid = recipientList.length > 0 && recipientList.length <= 50 && recipientList.every(validRecipient);
  const parsedAmount = parseAmount(amount);
  const amountValid = parsedAmount !== null;
  const durationSecs = parseDuration(durationValue, durationUnit);
  const durationValid = durationSecs !== null;
  const totalAmount = (parsedAmount ?? 0n) * BigInt(mode === "batch" ? recipientList.length : 1);
  const totalValid = totalAmount > 0n && totalAmount <= maxUint256;
  const allowanceQuery = useReadContract({
    address: token.address, abi: B20_ABI, functionName: "allowance", chainId,
    args: address ? [address, vaultAddress] : undefined,
    query: { enabled: connected && tokenReady && vaultReady },
  });
  const balanceQuery = useReadContract({
    address: token.address, abi: B20_ABI, functionName: "balanceOf", chainId,
    args: address ? [address] : undefined, query: { enabled: connected && tokenReady },
  });
  const { data: protocol } = useReadContract({
    address: vaultAddress, abi: DRIP_VAULT_ABI, functionName: "claimProtocolVersion", chainId,
    query: { enabled: vaultReady && mode === "claimable", retry: false },
  });
  const allowance = allowanceQuery.data;
  const allowanceLoading = allowanceQuery.isPending || balanceQuery.isPending;
  const readFailed = allowanceQuery.isError || balanceQuery.isError;
  const readsKnown = !readFailed && allowance !== undefined && balanceQuery.data !== undefined;
  const needsApprove = readsKnown && totalAmount > allowance;
  const ready = connected && tokenReady && vaultReady && amountValid && durationValid && totalValid && readsKnown &&
    (mode === "direct" ? validRecipient(recipient) : mode === "claimable" ? /^0x[0-9a-fA-F]{64}$/.test(secret) && protocol === 2n : batchValid);

  const submit = async (approve: boolean) => {
    if (lock.current || !ready || !client || !address || parsedAmount === null || durationSecs === null) return;
    lock.current = true; setIsPending(true); setFormError(null); setIsSuccess(false); setHash(undefined);
    try {
      const [a, b] = await Promise.all([allowanceQuery.refetch(), balanceQuery.refetch()]);
      if (a.error || b.error || a.data === undefined || b.data === undefined) throw new Error("read unavailable");
      if (totalAmount > b.data) { setFormError(`Insufficient ${symbol} balance. You have ${formatUnits(b.data, 18)} ${symbol}.`); return; }
      let tx: Hex;
      if (approve) {
        await client.simulateContract({ address: token.address, abi: B20_ABI, functionName: "approve", args: [vaultAddress, totalAmount], account: address });
        tx = await writeContractAsync({ address: token.address, abi: B20_ABI, functionName: "approve", args: [vaultAddress, totalAmount], account: address, chainId });
      } else {
        if (a.data < totalAmount) { setFormError("Approval changed. Approve the amount before creating a stream."); return; }
        if (mode === "direct") {
          const call = { address: vaultAddress, abi: DRIP_VAULT_ABI, functionName: "createStream" as const, args: [recipient as Hex, token.address, parsedAmount, BigInt(durationSecs)] as const, account: address };
          await client.simulateContract(call);
          tx = await writeContractAsync({ ...call, chainId });
        } else if (mode === "claimable") {
          const call = { address: vaultAddress, abi: DRIP_VAULT_ABI, functionName: "createClaimableStream" as const, args: [token.address, parsedAmount, BigInt(durationSecs), keccak256(secret as Hex)] as const, account: address };
          await client.simulateContract(call);
          tx = await writeContractAsync({ ...call, chainId });
        } else {
          const call = { address: vaultAddress, abi: DRIP_VAULT_ABI, functionName: "batchCreate" as const, args: [recipientList as Hex[], token.address, parsedAmount, BigInt(durationSecs)] as const, account: address };
          await client.simulateContract(call);
          tx = await writeContractAsync({ ...call, chainId });
        }
      }
      setHash(tx);
      const receipt = await client.waitForTransactionReceipt({ hash: tx });
      if (receipt.status !== "success") throw new Error("transaction reverted");
      setIsSuccess(true);
      if (!approve && mode === "claimable") {
        const ids: string[] = [];
        for (const log of receipt.logs) {
          if (log.address.toLowerCase() !== vaultAddress.toLowerCase()) continue;
          try { const event = decodeEventLog({ abi: DRIP_VAULT_ABI, eventName: "StreamCreated", data: log.data, topics: log.topics }); ids.push(event.args.streamId.toString()); } catch { /* unrelated log */ }
        }
        setCreatedClaim({ secret: secret as Hex, ids }); setSecret("");
      }
      await Promise.all([allowanceQuery.refetch(), balanceQuery.refetch()]);
    } catch (e) { setFormError(describeTransactionError(e)); }
    finally { lock.current = false; setIsPending(false); }
  };
  const handleApprove = () => void submit(true);
  const handleCreate = () => void submit(false);

  return (
    <fieldset disabled={isPending} className="space-y-4">
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

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <label className={labelCls}>
          <span className="font-medium">Duration</span>
          <input value={durationValue} onChange={(e) => { setDurationValue(e.target.value); setFormError(null); }} placeholder="30" inputMode="decimal" className={inputCls} />
        </label>
        <label className={labelCls}>
          <span className="font-medium">Unit</span>
          <select value={durationUnit} onChange={(e) => setDurationUnit(e.target.value as typeof durationUnit)} className={`${inputCls} min-w-[7.5rem]`}>
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
            <option value="weeks">Weeks</option>
          </select>
        </label>
      </div>
      <div className="-mt-2 text-xs text-muted">Unlocks linearly per second, minimum 1 minute. Withdraw anytime.</div>

      {formError && (
        <div role="alert" className="rounded-xl border border-danger/30 bg-red-50 p-3 text-sm text-danger">{formError}</div>
      )}

      {mode === "claimable" && protocol !== 2n && <p role="status" className="text-sm text-muted">Secure claim links require the updated vault. Use direct streams on this legacy deployment.</p>}
      {createdClaim && <div className="space-y-1 text-xs">
        <p>Created claim stream ID(s): {createdClaim.ids.join(", ") || "see transaction receipt"}. Save this secret before leaving.</p>
        <input readOnly aria-label="Created claim secret" value={createdClaim.secret} className={`${inputCls} font-mono text-xs`} />
        <p>A new secret is required for the next stream.</p>
      </div>}

      {!address ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Connect a wallet to create a stream.</div>
      ) : !connected ? (
        <p role="alert">Wait for wallet reconnection or switch to the displayed supported network.</p>
      ) : !vaultReady ? (
        <div className="rounded-xl border border-hairline bg-paper p-3 text-sm">
          Vault not deployed on this chain yet. Switch to a supported network to continue.
        </div>
      ) : !tokenReady ? (
        <div className="rounded-xl border border-hairline bg-paper p-3 text-sm">
          {symbol} is not configured on this chain yet — the deployer still needs to register its address.
        </div>
      ) : readFailed ? (
        <p role="alert">Could not check balance or approval. <button onClick={() => { void allowanceQuery.refetch(); void balanceQuery.refetch(); }} className="underline">Retry</button></p>
      ) : allowanceLoading || !readsKnown ? (
        <button disabled className="w-full rounded-xl bg-zinc-200 py-3 text-sm font-semibold text-zinc-500">Checking approval…</button>
      ) : needsApprove ? (
        <button onClick={handleApprove} disabled={isPending || !ready} className="w-full rounded-xl bg-ink py-3 text-sm font-semibold text-white disabled:opacity-50">
          {isPending ? "Approving…" : `Approve ${formatUnits(totalAmount, 18)} ${symbol}`}
        </button>
      ) : (
        <button onClick={handleCreate} disabled={isPending || !ready} className="w-full rounded-xl bg-baseblue py-3 text-sm font-semibold text-white hover:bg-basedark disabled:opacity-50">
          {isPending ? "Creating…" : mode === "direct" ? `Stream ${amount} ${symbol}` : mode === "claimable" ? `Create claim link` : `Stream to ${recipientList.length} recipients`}
        </button>
      )}

      {hash && <div className="break-all font-mono text-xs text-muted tnum">tx: {hash} {isSuccess && "✓ confirmed"}</div>}
      {isPending && <p role="status">{hash ? "Waiting for confirmation…" : "Check your wallet…"}</p>}

      <p className="border-t border-hairline pt-3 text-xs leading-relaxed text-muted">
        Settles in raw token units — 1 token ≠ 1 share across corporate actions. {token.chainlinkFeed ? "Prices are reference only; the vault uses no oracle." : "No price feed on testnet."}
      </p>
    </fieldset>
  );
}
