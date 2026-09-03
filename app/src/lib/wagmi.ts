import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { coinbaseWallet, injected } from "wagmi/connectors";

export const config = createConfig({
  // Sepolia first: disconnected visitors land on the testnet view.
  chains: [baseSepolia, base],
  connectors: [
    injected(),
    coinbaseWallet({ appName: "DripStocks", preference: "all" }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
