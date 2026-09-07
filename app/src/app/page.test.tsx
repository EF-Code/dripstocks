import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import Home from "./page";
const state = vi.hoisted(() => ({ connected: false, reconnecting: false, chainId: 84532, error: null as Error | null, connect: vi.fn() }));
vi.mock("wagmi", () => ({
  useAccount: () => ({ isConnected: state.connected, isReconnecting: state.reconnecting, chainId: state.chainId }),
  useChainId: () => 84532,
  useConnect: () => ({ connect: state.connect, connectors: [{ uid: "browser", id: "injected", name: "Injected" }], isPending: false, error: state.error }),
  useDisconnect: () => ({ disconnect: vi.fn() }),
  useSwitchChain: () => ({ switchChain: vi.fn(), isPending: false }),
  useReadContract: () => ({ data: 0n }),
}));
vi.mock("@/lib/wagmi", () => ({ WALLET_CONNECT_READY: false }));
vi.mock("@/components/CreateStream", () => ({ CreateStream: () => null }));
vi.mock("@/components/StreamDashboard", () => ({ StreamDashboard: () => null }));
beforeEach(() => { state.connected = false; state.reconnecting = false; state.chainId = 84532; state.error = null; state.connect.mockReset(); });
it("does not offer another connection while restoring a session", () => {
  state.reconnecting = true; render(<Home />);
  expect(screen.getByText("Reconnecting…")).toBeDisabled();
  expect(screen.queryByText("Connect wallet")).toBeNull();
});
it("keeps connection errors visible after chooser closes", () => {
  const view = render(<Home />); fireEvent.click(screen.getByText("Connect wallet")); fireEvent.click(screen.getByText("Browser wallet"));
  state.error = new Error("connector failed"); view.rerender(<Home />);
  expect(screen.queryByRole("menu")).toBeNull(); expect(screen.getByRole("alert")).toHaveTextContent("Connection failed");
});
it("uses actual wallet network for unsupported-chain banner", () => {
  state.connected = true; state.chainId = 1; render(<Home />);
  expect(screen.getByText("Unsupported network.")).toBeVisible();
  expect(screen.getByText("Switch to Base Sepolia")).toBeEnabled();
});
it("blocks Base mainnet because this release is testnet-only", () => {
  state.connected = true; state.chainId = 8453; render(<Home />);
  expect(screen.getByText("Unsupported network.")).toBeVisible();
  expect(screen.getByText(/runs on Base Sepolia/)).toBeVisible();
});
