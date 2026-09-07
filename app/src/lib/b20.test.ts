import { describe, it, expect } from "vitest";
import type { AbiFunction } from "viem";
import { B20_TOKENS, ONCHAIN_REGISTRY, DRIP_VAULT_ADDRESS, DRIP_VAULT_ADDRESSES, DRIP_VAULT_ABI, getVaultAddress, getTokens, isTokenConfigured, normalizeVaultAddress, SEPOLIA_TOKENS } from "./b20";

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

  it("DRIP_VAULT_ADDRESS defaults to zero if not set (deprecated fallback)", () => {
    // In test env NEXT_PUBLIC_DRIP_VAULT* not set
    expect(DRIP_VAULT_ADDRESS).toBe("0x0000000000000000000000000000000000000000");
  });

  it("per-chain map defaults to zero and getVaultAddress resolves chains", () => {
    expect(DRIP_VAULT_ADDRESSES[8453]).toBe("0x0000000000000000000000000000000000000000");
    expect(DRIP_VAULT_ADDRESSES[84532]).toBe("0x0000000000000000000000000000000000000000");
    expect(getVaultAddress(8453)).toBe("0x0000000000000000000000000000000000000000");
    expect(getVaultAddress(84532)).toBe("0x0000000000000000000000000000000000000000");
    expect(getVaultAddress(undefined)).toBe(DRIP_VAULT_ADDRESS);
  });

  it("normalizeVaultAddress repairs checksum casing instead of bricking to zero", () => {
    // Prod v2 vault was once deployed with a single mis-cased checksum char (fe vs Fe);
    // the UI must resolve it to the checksummed address, not the zero address.
    expect(normalizeVaultAddress("0x115fe60FD510c04fC765D06241623eAda42529B2")).toBe(
      "0x115Fe60FD510c04fC765D06241623eAda42529B2",
    );
    expect(normalizeVaultAddress("0x115fe60fd510c04fc765d06241623eada42529b2")).toBe(
      "0x115Fe60FD510c04fC765D06241623eAda42529B2",
    );
    expect(normalizeVaultAddress("0x0000000000000000000000000000000000000000")).toBe(
      "0x0000000000000000000000000000000000000000",
    );
    expect(normalizeVaultAddress("0x...")).toBe("0x0000000000000000000000000000000000000000");
    expect(normalizeVaultAddress("not-an-address")).toBe("0x0000000000000000000000000000000000000000");
  });

  it("getVaultAddress output is always normalized (never mis-checksummed)", () => {
    for (const c of [8453, 84532, undefined] as const) {
      const v = getVaultAddress(c);
      expect(normalizeVaultAddress(v)).toBe(v);
    }
  });

  it("DRIP_VAULT_ABI matches DripVault.sol signatures", () => {
    const byName: Record<string, AbiFunction> = Object.fromEntries(DRIP_VAULT_ABI.filter((e) => e.type === "function").map((e) => [e.name, e]));
    // Existing entries kept
    for (const n of ["createStream", "vested", "withdrawable", "withdraw", "streams", "nextStreamId"]) {
      expect(byName[n]).toBeDefined();
    }
    // New entries
    expect(byName.createClaimableStream.inputs.map((i) => i.type)).toEqual(["address", "uint256", "uint256", "bytes32"]);
    expect(byName.createClaimableStream.inputs.map((i) => i.name)).toEqual(["token", "amount", "duration", "claimHash"]);
    expect(byName.claim.inputs.map((i) => i.type)).toEqual(["uint256", "bytes"]);
    expect(byName.cancel.inputs.map((i) => i.type)).toEqual(["uint256"]);
    expect(byName.batchCreate.inputs.map((i) => i.type)).toEqual(["address[]", "address", "uint256", "uint256"]);
    expect(byName.batchCreate.inputs.map((i) => i.name)).toEqual(["recipients", "token", "amountEach", "duration"]);
  });

  it("all tokens have unique addresses and feeds", () => {
    const addrs = new Set(Object.values(B20_TOKENS).map(t => t.address.toLowerCase()));
    const feeds = new Set(Object.values(B20_TOKENS).map(t => t.chainlinkFeed.toLowerCase()));
    expect(addrs.size).toBe(6);
    expect(feeds.size).toBe(6);
  });

  it("getTokens returns mocks on Sepolia and real B20 elsewhere", () => {
    const sepolia = getTokens(84532);
    expect(Object.keys(sepolia)).toEqual(["AAPLc","NVDAc","METAc","GOOGLc","MSFTc","TSLAc"]);
    for (const t of Object.values(sepolia)) {
      expect(t.mock).toBe(true);
      expect(t.chainlinkFeed).toBe("");
    }
    // Unset in test env -> zero addresses -> not configured
    expect(isTokenConfigured(sepolia.AAPLc)).toBe(false);
    expect(SEPOLIA_TOKENS.NVDAc.mock).toBe(true);
    const mainnet = getTokens(8453);
    for (const t of Object.values(mainnet)) {
      expect(t.mock).toBe(false);
      expect(isTokenConfigured(t)).toBe(true);
    }
    expect(mainnet.AAPLc.address).toBe(B20_TOKENS.AAPLc.address);
    expect(getTokens(undefined).AAPLc.mock).toBe(false);
  });
});
