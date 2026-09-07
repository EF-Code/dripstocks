import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { encodeAbiParameters, keccak256, maxUint256 } from "viem";
import { StreamDashboard, parseStreamId } from "./StreamDashboard";

const state = vi.hoisted(() => ({
  address: "0x1111111111111111111111111111111111111111", chainId: 84532,
  next: 26n, protocol: 2n, write: vi.fn(), simulate: vi.fn(), receipt: vi.fn(),
}));
const vault = "0x3333333333333333333333333333333333333333";
vi.mock("@/lib/b20", async (load) => ({ ...await load<object>(), getVaultAddress: () => "0x3333333333333333333333333333333333333333" }));
vi.mock("wagmi", () => ({
  useAccount: () => ({ address: state.address, chainId: state.chainId, status: "connected" }),
  useChainId: () => 84532,
  usePublicClient: () => ({ simulateContract: state.simulate, waitForTransactionReceipt: state.receipt }),
  useWriteContract: () => ({ writeContractAsync: state.write }),
  useReadContract: ({ functionName, args }: { functionName: string; args?: bigint[] }) => ({
    data: functionName === "nextStreamId" ? state.next : functionName === "claimProtocolVersion" ? state.protocol
      : [args?.[0] === 0n ? state.address : "0x2222222222222222222222222222222222222222", state.address === "recipient" ? state.address : "0x2222222222222222222222222222222222222222", vault, 10n ** 18n, 0n, 1n, 2n, false, `0x${"00".repeat(32)}`],
    isPending: false, refetch: vi.fn(),
  }),
}));
function mount() { return render(<QueryClientProvider client={new QueryClient()}><StreamDashboard /></QueryClientProvider>); }
beforeEach(() => {
  state.address = "0x1111111111111111111111111111111111111111"; state.chainId = 84532; state.next = 26n; state.protocol = 2n;
  state.write.mockReset().mockResolvedValue(`0x${"ab".repeat(32)}`);
  state.simulate.mockReset().mockResolvedValue({}); state.receipt.mockReset().mockResolvedValue({ status: "success" });
});
describe("stream access regressions", () => {
  it("finds older stream after 25 unrelated streams evict it", () => {
    mount(); expect(screen.queryByText("Cancel")).toBeNull();
    fireEvent.click(screen.getByText("Older streams")); expect(screen.getByText("Cancel")).toBeEnabled();
  });
  it("direct lookup reaches old stream without scanning all IDs", () => {
    state.next = 1000000n; mount();
    fireEvent.change(screen.getByLabelText("Find stream ID"), { target: { value: "0" } });
    fireEvent.click(screen.getByText("Find stream")); expect(screen.getByText("Cancel")).toBeEnabled();
  });
  it("does not expose other wallets' actions through lookup", () => {
    mount(); fireEvent.change(screen.getByLabelText("Find stream ID"), { target: { value: "1" } });
    fireEvent.click(screen.getByText("Find stream")); expect(screen.getByText("This stream belongs to another wallet.")).toBeVisible();
  });
  it("blocks unsupported actual wallet chain even if configured chain remains Sepolia", () => {
    state.chainId = 1; mount(); expect(screen.getByRole("alert")).toHaveTextContent("Switch your wallet");
    expect(screen.queryByText("Prepare claim")).toBeNull();
  });
  it("blocks an explicit legacy vault override on the wrong chain", () => {
    state.chainId = 8453;
    render(<QueryClientProvider client={new QueryClient()}><StreamDashboard vaultAddress={vault} claimsEnabled={false} /></QueryClientProvider>);
    expect(screen.getByRole("alert")).toHaveTextContent("Switch your wallet");
    expect(state.write).not.toHaveBeenCalled();
  });
  it("omits unsafe legacy claim controls while preserving stream management", () => {
    render(<QueryClientProvider client={new QueryClient()}><StreamDashboard vaultAddress={vault} claimsEnabled={false} /></QueryClientProvider>);
    expect(screen.queryByText("Prepare claim")).toBeNull();
    expect(screen.getByText("Older streams")).toBeEnabled();
  });
  it("bounds IDs without Number precision loss", () => {
    expect(parseStreamId("9007199254740993")).toBe(9007199254740993n);
    expect(parseStreamId((maxUint256 + 1n).toString())).toBeNull();
    expect(parseStreamId("1e3")).toBeNull();
  });
  it("disables unsafe claim calls on legacy vault", () => {
    state.protocol = 0n; mount(); expect(screen.getByText("Prepare claim")).toBeDisabled();
    expect(screen.getByText(/Claims are disabled/)).toBeVisible();
  });
  it("commits bound hash before revealing secret in a separate confirmed transaction", async () => {
    mount(); const secret = `0x${"12".repeat(32)}` as `0x${string}`;
    fireEvent.change(screen.getByLabelText("Claim stream ID"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Claim secret"), { target: { value: secret } });
    fireEvent.click(screen.getByText("Prepare claim"));
    await waitFor(() => expect(screen.getByText("Claim")).toBeEnabled());
    const commitment = keccak256(encodeAbiParameters([{ type: "address" }, { type: "uint256" }, { type: "uint256" }, { type: "address" }, { type: "bytes" }], [vault, 84532n, 0n, state.address as `0x${string}`, secret]));
    expect(state.write.mock.calls[0][0]).toMatchObject({ functionName: "commitClaim", args: [0n, commitment], chainId: 84532, account: state.address });
    fireEvent.click(screen.getByText("Claim"));
    await waitFor(() => expect(state.write).toHaveBeenCalledTimes(2));
    expect(state.write.mock.calls[1][0]).toMatchObject({ functionName: "claim", args: [0n, secret], chainId: 84532 });
  });
  it("keeps actions disabled while a transaction awaits mining and shows rejection", async () => {
    state.next = 1n;
    let reject!: (e: Error) => void;
    state.receipt.mockImplementation(() => new Promise((_, r) => { reject = r; }));
    mount(); fireEvent.click(screen.getByText("Cancel")); fireEvent.click(screen.getByText("Confirm cancel?"));
    await waitFor(() => expect(screen.getByText("Waiting for confirmation…")).toBeVisible());
    expect(screen.getByText("Cancel")).toBeDisabled(); reject(new Error("receipt unavailable"));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Transaction failed"));
  });
});
