import { maxUint256, parseUnits } from "viem";

export function parseAmount(value: string): bigint | null {
  const s = value.trim();
  if (s.length > 100 || !/^\d+(?:\.\d{0,18})?$/.test(s)) return null;
  try { const amount = parseUnits(s, 18); return amount > 0n && amount <= maxUint256 ? amount : null; }
  catch { return null; }
}
export function parseDuration(value: string, unit: "minutes" | "hours" | "days" | "weeks"): number | null {
  if (!/^\d+(?:\.\d+)?$/.test(value.trim())) return null;
  const seconds = Math.floor(Number(value) * { minutes: 60, hours: 3600, days: 86400, weeks: 604800 }[unit]);
  return Number.isSafeInteger(seconds) && seconds >= 60 ? seconds : null;
}
