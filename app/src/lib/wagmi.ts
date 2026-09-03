import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID;

/** False until a WalletConnect Cloud project ID is configured (free at cloud.reown.com). */
export const WALLET_CONNECT_READY = Boolean(projectId);

const metadata = {
  name: "DripStocks",
  description: "Stream tokenized stocks per second on Base.",
  url: "https://dripstocks.vercel.app",
  icons: ["https://dripstocks.vercel.app/icon.svg"],
};

export const config = createConfig({
  // Sepolia first: disconnected visitors land on the testnet view.
  chains: [baseSepolia, base],
  connectors: [
    injected(),
    coinbaseWallet({ appName: "DripStocks", preference: { options: "all", telemetry: false } }),
    // QR-code path for any mobile/external wallet. Requires the project ID;
    // without it the connector is omitted and the UI says so honestly.
    ...(WALLET_CONNECT_READY
      ? [walletConnect({ projectId: projectId as string, metadata, showQrModal: true })]
      : []),
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
