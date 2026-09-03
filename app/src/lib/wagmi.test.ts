import { describe, it, expect } from "vitest";
import { config, WALLET_CONNECT_READY } from "./wagmi";
import { base, baseSepolia } from "wagmi/chains";

describe("wagmi config", () => {
  it("supports Base and Base Sepolia", () => {
    const chainIds = config.chains.map(c => c.id);
    expect(chainIds).toContain(base.id);
    expect(chainIds).toContain(baseSepolia.id);
    expect(base.id).toBe(8453);
    expect(baseSepolia.id).toBe(84532);
  });

  it("has connectors", () => {
    expect(config.connectors.length).toBeGreaterThanOrEqual(1);
  });

  it("omits WalletConnect without a project ID (honest fallback)", () => {
    // No NEXT_PUBLIC_WC_PROJECT_ID in test env
    expect(WALLET_CONNECT_READY).toBe(false);
    expect(config.connectors.map((c) => c.id)).not.toContain("walletConnect");
    expect(config.connectors.map((c) => c.id)).toContain("injected");
  });
});
