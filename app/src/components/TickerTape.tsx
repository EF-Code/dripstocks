"use client";
import { getTokens, type B20Symbol } from "@/lib/b20";

/** Subject-true marquee: the six listed tokens, scrolling like an exchange tape. */
export function TickerTape({ chainId }: { chainId?: number }) {
  const tokens = getTokens(chainId);
  const symbols = Object.keys(tokens) as B20Symbol[];
  const row = (ariaHidden: boolean) => (
    <div aria-hidden={ariaHidden} className="flex shrink-0 items-center">
      {symbols.map((s) => {
        const t = tokens[s];
        return (
          <span key={s} className="flex items-center gap-2 px-6 py-2.5 text-[13px] whitespace-nowrap">
            <span className="font-display font-semibold tracking-wide">{s}</span>
            <span className="font-mono text-xs text-muted tnum">
              {t.address === "0x0000000000000000000000000000000000000000" ? "not deployed" : `${t.address.slice(0, 6)}…${t.address.slice(-4)}`}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${t.mock ? "bg-amber-100 text-amber-800" : "bg-mint/15 text-mintdim"}`}>
              {t.mock ? "MOCK" : "B20"}
            </span>
            <span className="ml-4 h-1 w-1 rounded-full bg-hairline" />
          </span>
        );
      })}
    </div>
  );
  return (
    <div className="overflow-hidden border-y border-hairline bg-card tape-mask" role="marquee" aria-label="Listed tokens">
      <div className="tape-track flex w-max animate-tape">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
