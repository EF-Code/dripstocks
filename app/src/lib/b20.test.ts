import { describe, it, expect } from "vitest";
import { B20_TOKENS, ONCHAIN_REGISTRY, DRIP_VAULT_ADDRESS } from "./b20";

describe("B20 config", () => {
  it("has 6 tokens with correct checksum addresses", () => {
    expect(Object.keys(B20_TOKENS)).toEqual(["AAPLc","NVDAc","METAc","GOOGLc","MSFTc","TSLAc"]);
    for (const t of Object.values(B20_TOKENS)) {
      expect(t.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(t.chainlinkFeed).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(t.symbol).toMatch(/c$/);
    }
  });

  it("registry address is correct", () => {
    expect(ONCHAIN_REGISTRY).toBe("0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD");
  });

  it("AAPLc and NVDAc are precompile B20 (b200 prefix)", () => {
    expect(B20_TOKENS.AAPLc.address.toLowerCase().startsWith("0xb200")).toBe(true);
    expect(B20_TOKENS.NVDAc.address.toLowerCase().startsWith("0xb200")).toBe(true);
  });

  it("DRIP_VAULT_ADDRESS defaults to zero if not set", () => {
    // In test env NEXT_PUBLIC_DRIP_VAULT not set
    expect(DRIP_VAULT_ADDRESS).toBe("0x0000000000000000000000000000000000000000");
  });

  it("all tokens have unique addresses and feeds", () => {
    const addrs = new Set(Object.values(B20_TOKENS).map(t => t.address.toLowerCase()));
    const feeds = new Set(Object.values(B20_TOKENS).map(t => t.chainlinkFeed.toLowerCase()));
    expect(addrs.size).toBe(6);
    expect(feeds.size).toBe(6);
  });
});
