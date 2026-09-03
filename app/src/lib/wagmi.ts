import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { coinbaseWallet, injected } from "wagmi/connectors";

export const config = createConfig({
  // Sepolia first: disconnected visitors land on the testnet view.
  chains: [baseSepolia, base],
  connectors: [
    injected(),
    // telemetry:false disables the wallet SDK's analytics loader, which
    // otherwise POSTs to Coinbase endpoints and logs AnalyticsSDKApiError
    // failures in consoles where those requests are blocked.
    coinbaseWallet({ appName: "DripStocks", preference: { options: "all", telemetry: false } }),
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
