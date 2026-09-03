import { describe, it, expect } from "vitest";
import { config } from "./wagmi";
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
});
