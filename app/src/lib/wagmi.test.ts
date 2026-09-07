import { describe, it, expect } from "vitest";
import { config, WALLET_CONNECT_READY } from "./wagmi";
import { baseSepolia } from "wagmi/chains";

describe("wagmi config", () => {
  it("supports only the deployed Base Sepolia testnet", () => {
    const chainIds = config.chains.map(c => c.id);
    expect(chainIds).toEqual([baseSepolia.id]);
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
