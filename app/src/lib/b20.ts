// B20 Tokenized Stocks on Base - from docs.base.org/base-chain/asset-issuance/tokenized-stocks-on-base
// Addresses are precompiles (no bytecode on Basescan), verified via Base docs
export const B20_TOKENS = {
  AAPLc: {
    symbol: "AAPLc",
    name: "Apple Coinbase Tokenized Stock",
    address: "0xb200000000000000000000C2e324d24d7eEcd1fb" as const,
    chainlinkFeed: "0x787f13dEa48Db0897CbCDD985de77809D837F988" as const,
    logo: "🍎",
  },
  NVDAc: {
    symbol: "NVDAc",
    name: "Nvidia Coinbase Tokenized Stock",
    address: "0xb20000000000000000000078ee7ce2fE4908108C" as const,
    chainlinkFeed: "0x04689a41629776563E6822F76f2e57D148d28513" as const,
    logo: "💚",
  },
  METAc: {
    symbol: "METAc",
    name: "Meta Coinbase Tokenized Stock",
    address: "0xb2000000000000000000008bC8786B856E61707C" as const,
    chainlinkFeed: "0x6526aE6797A76123638b863AeE4dD27Ba4E4b27D" as const,
    logo: "📘",
  },
  GOOGLc: {
    symbol: "GOOGLc",
    name: "Alphabet Coinbase Tokenized Stock",
    address: "0xb2000000000000000000002D0BA3164cc74f58B7" as const,
    chainlinkFeed: "0x5bF49E0ffA937CE2FfF033c739aD7C634c4D34F2" as const,
    logo: "🔍",
  },
  MSFTc: {
    symbol: "MSFTc",
    name: "Microsoft Coinbase Tokenized Stock",
    address: "0xB200000000000000000000Ab99cFa739E253872B" as const,
    chainlinkFeed: "0xeB10A6c9aa7E537aEd766C08c35Dae35B321b18c" as const,
    logo: "🪟",
  },
  TSLAc: {
    symbol: "TSLAc",
    name: "Tesla Coinbase Tokenized Stock",
    address: "0xb2000000000000000000001e800a7f5189430cD0" as const,
    chainlinkFeed: "0xFaf869185383a24F8cb00e27BdA6b63B9905DCb4" as const,
    logo: "🚗",
  },
} as const;

export type B20Symbol = keyof typeof B20_TOKENS;

export interface TokenInfo {
  symbol: string;
  name: string;
  address: `0x${string}`;
  chainlinkFeed: string;
  logo: string;
  /** True for Sepolia MockB20 stand-ins (open mint); false for real B20 precompiles. */
  mock: boolean;
}

const ZERO_TOKEN = "0x0000000000000000000000000000000000000000" as const;

function sepoliaMock(symbol: B20Symbol, name: string, logo: string, env: string | undefined): TokenInfo {
  return {
    symbol,
    name,
    address: ((env as `0x${string}` | undefined) || ZERO_TOKEN) as `0x${string}`,
    chainlinkFeed: "",
    logo,
    mock: true,
  };
}

/** MockB20 addresses on Base Sepolia, filled after running DeployTestnet.s.sol. */
export const SEPOLIA_TOKENS: Record<B20Symbol, TokenInfo> = {
  AAPLc: sepoliaMock("AAPLc", "Apple Mock Tokenized Stock", "🍎", process.env.NEXT_PUBLIC_SEPOLIA_AAPLC),
  NVDAc: sepoliaMock("NVDAc", "Nvidia Mock Tokenized Stock", "💚", process.env.NEXT_PUBLIC_SEPOLIA_NVDAC),
  METAc: sepoliaMock("METAc", "Meta Mock Tokenized Stock", "📘", process.env.NEXT_PUBLIC_SEPOLIA_METAC),
  GOOGLc: sepoliaMock("GOOGLc", "Alphabet Mock Tokenized Stock", "🔍", process.env.NEXT_PUBLIC_SEPOLIA_GOOGLC),
  MSFTc: sepoliaMock("MSFTc", "Microsoft Mock Tokenized Stock", "🪟", process.env.NEXT_PUBLIC_SEPOLIA_MSFTC),
  TSLAc: sepoliaMock("TSLAc", "Tesla Mock Tokenized Stock", "🚗", process.env.NEXT_PUBLIC_SEPOLIA_TSLAC),
};

/** Chain-aware token list: mocks on Sepolia (84532), real B20 precompiles elsewhere. */
export function getTokens(chainId?: number): Record<B20Symbol, TokenInfo> {
  if (chainId === 84532) return SEPOLIA_TOKENS;
  return (Object.keys(B20_TOKENS) as B20Symbol[]).reduce((acc, k) => {
    acc[k] = { ...B20_TOKENS[k], mock: false };
    return acc;
  }, {} as Record<B20Symbol, TokenInfo>);
}

export function isTokenConfigured(t: Pick<TokenInfo, "address">): boolean {
  return t.address !== ZERO_TOKEN;
}

export const B20_ADDRESSES = Object.values(B20_TOKENS).map((t) => t.address);

export const ONCHAIN_REGISTRY = "0x3f3E8cf41cdd3b1D118c16471aB0113DfDDd5CaD" as const;

// Minimal B20 ABI (ERC20 + multiplier helpers)
export const B20_ABI = [
  { type: "function", name: "name", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
  { type: "function", name: "symbol", inputs: [], outputs: [{ type: "string" }], stateMutability: "view" },
  { type: "function", name: "decimals", inputs: [], outputs: [{ type: "uint8" }], stateMutability: "view" },
  { type: "function", name: "balanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "scaledBalanceOf", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "multiplier", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "WAD_PRECISION", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "approve", inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "allowance", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "transfer", inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ type: "bool" }], stateMutability: "nonpayable" },
] as const;

export const DRIP_VAULT_ABI = [
  { type: "function", name: "createStream", inputs: [{ name: "recipient", type: "address" }, { name: "token", type: "address" }, { name: "amount", type: "uint256" }, { name: "duration", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "createClaimableStream", inputs: [{ name: "token", type: "address" }, { name: "amount", type: "uint256" }, { name: "duration", type: "uint256" }, { name: "claimHash", type: "bytes32" }], outputs: [{ type: "uint256" }], stateMutability: "nonpayable" },
  { type: "function", name: "claim", inputs: [{ name: "streamId", type: "uint256" }, { name: "preimage", type: "bytes" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "cancel", inputs: [{ name: "streamId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "batchCreate", inputs: [{ name: "recipients", type: "address[]" }, { name: "token", type: "address" }, { name: "amountEach", type: "uint256" }, { name: "duration", type: "uint256" }], outputs: [{ type: "uint256[]" }], stateMutability: "nonpayable" },
  { type: "function", name: "vested", inputs: [{ name: "streamId", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "withdrawable", inputs: [{ name: "streamId", type: "uint256" }], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "withdraw", inputs: [{ name: "streamId", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "streams", inputs: [{ name: "", type: "uint256" }], outputs: [{ type: "address", name: "sender" }, { type: "address", name: "recipient" }, { type: "address", name: "token" }, { type: "uint256", name: "totalAmount" }, { type: "uint256", name: "withdrawn" }, { type: "uint256", name: "start" }, { type: "uint256", name: "end" }, { type: "bool", name: "canceled" }, { type: "bytes32", name: "claimHash" }], stateMutability: "view" },
  { type: "function", name: "nextStreamId", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
] as const;

// Per-chain vault addresses. Reads NEXT_PUBLIC_DRIP_VAULT_BASE (8453) and
// NEXT_PUBLIC_DRIP_VAULT_SEPOLIA (84532), falling back to legacy
// NEXT_PUBLIC_DRIP_VAULT for compat. Unset chains default to zero address.
const ZERO_VAULT = "0x0000000000000000000000000000000000000000" as const;
const legacyVault = (process.env.NEXT_PUBLIC_DRIP_VAULT as `0x${string}` | undefined) || ZERO_VAULT;

export const DRIP_VAULT_ADDRESSES: Record<8453 | 84532, `0x${string}`> = {
  8453: ((process.env.NEXT_PUBLIC_DRIP_VAULT_BASE as `0x${string}` | undefined) || legacyVault) as `0x${string}`,
  84532: ((process.env.NEXT_PUBLIC_DRIP_VAULT_SEPOLIA as `0x${string}` | undefined) || legacyVault) as `0x${string}`,
};

export function getVaultAddress(chainId?: number): `0x${string}` {
  if (chainId === 8453) return DRIP_VAULT_ADDRESSES[8453];
  if (chainId === 84532) return DRIP_VAULT_ADDRESSES[84532];
  return DRIP_VAULT_ADDRESS;
}

/** @deprecated Use getVaultAddress(chainId) / DRIP_VAULT_ADDRESSES. Kept to avoid breaking imports. */
export const DRIP_VAULT_ADDRESS = legacyVault;
