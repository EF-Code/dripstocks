import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CreateStream } from "./CreateStream";
import { parseAmount, parseDuration } from "@/lib/stream-input";
const s = vi.hoisted(() => ({ chainId: 84532, allowance: 0n as bigint | undefined, failed: false, protocol: 2n, write: vi.fn(), receipt: vi.fn(), read: vi.fn(), simulate: vi.fn() }));
vi.mock("@/lib/b20", async (load) => {
  const real = await load<typeof import("@/lib/b20")>();
  return { ...real, getVaultAddress: () => "0x3333333333333333333333333333333333333333", getTokens: () => real.getTokens(8453) };
});
vi.mock("wagmi", () => ({
  useAccount: () => ({ address: "0x1111111111111111111111111111111111111111", chainId: s.chainId, status: "connected" }),
  useChainId: () => 84532,
  usePublicClient: () => ({ simulateContract: s.simulate, waitForTransactionReceipt: s.receipt }),
  useWriteContract: () => ({ writeContractAsync: s.write }),
  useReadContract: ({ functionName }: { functionName: string }) => ({
    data: functionName === "allowance" ? s.allowance : functionName === "claimProtocolVersion" ? s.protocol : 10n ** 20n,
    isError: s.failed, isPending: false,
    refetch: () => { s.read(functionName); return Promise.resolve({ data: functionName === "allowance" ? s.allowance : 10n ** 20n, error: s.failed ? new Error("rpc") : null }); },
  }),
}));
beforeEach(() => {
  s.chainId = 84532; s.allowance = 0n; s.failed = false; s.protocol = 2n;
  s.write.mockReset().mockResolvedValue(`0x${"11".repeat(32)}`); s.simulate.mockReset().mockResolvedValue({});
  s.receipt.mockReset().mockResolvedValue({ status: "success", logs: [] }); s.read.mockReset();
});
function ready() {
  const view = render(<CreateStream />);
  fireEvent.change(screen.getByLabelText(/Recipient wallet/), { target: { value: "0x2222222222222222222222222222222222222222" } });
  return view;
}
it("rejects unsupported numeric syntaxes, precision loss and infinite durations", () => {
  for (const v of ["1e3", "0x10", "0.0000000000000000001", "-1", "", "9".repeat(90)]) expect(parseAmount(v)).toBeNull();
  expect(parseAmount("0.000000000000000001")).toBe(1n);
  expect(parseDuration("5", "minutes")).toBe(300);
  expect(parseDuration("1e308", "weeks")).toBeNull();
  expect(parseDuration("9".repeat(308), "weeks")).toBeNull();
});
it("malformed amount does not crash render or enable transactions", () => {
  ready(); fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "1e3" } });
  expect(screen.getByRole("button", { name: /Stream 1e3/ })).toBeDisabled();
});
it("unknown allowance fails closed", () => {
  s.allowance = undefined; ready(); expect(screen.getByText("Checking approval…")).toBeDisabled();
});
it("RPC failures expose retry, not create", () => {
  s.failed = true; ready(); expect(screen.getByRole("alert")).toHaveTextContent("Could not check balance");
  expect(screen.queryByRole("button", { name: /^Stream/ })).toBeNull();
});
it("blocks zero recipient and actual wallet network mismatch", () => {
  const view = ready(); fireEvent.change(screen.getByLabelText(/Recipient wallet/), { target: { value: `0x${"0".repeat(40)}` } });
  expect(screen.getByRole("button", { name: /^Approve/ })).toBeDisabled();
  s.chainId = 1; view.rerender(<CreateStream />); expect(screen.getByRole("alert")).toHaveTextContent("supported network");
});
it("waits for mining then refreshes allowance and balance", async () => {
  let finish!: (v: object) => void;
  s.receipt.mockImplementation(() => new Promise((r) => { finish = r; }));
  const view = ready(); fireEvent.click(screen.getByRole("button", { name: /^Approve/ }));
  await waitFor(() => expect(screen.getByText("Waiting for confirmation…")).toBeVisible());
  expect(screen.getByRole("button", { name: "Approving…" })).toBeDisabled();
  expect(s.write.mock.calls[0][0]).toMatchObject({ chainId: 84532, account: "0x1111111111111111111111111111111111111111", functionName: "approve" });
  s.allowance = 10n ** 18n; finish({ status: "success", logs: [] });
  await waitFor(() => expect(s.read).toHaveBeenCalledTimes(4)); view.rerender(<CreateStream />);
  expect(screen.getByRole("button", { name: "Stream 0.1 AAPLc" })).toBeEnabled();
});
it("fresh allowance is checked immediately before creation", async () => {
  s.allowance = 10n ** 18n; ready(); s.allowance = 0n;
  fireEvent.click(screen.getByRole("button", { name: /^Stream/ }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Approval changed"));
  expect(s.write).not.toHaveBeenCalled();
});
it("confirmed claim creation saves sent secret and requires a new one", async () => {
  s.allowance = 10n ** 18n; ready(); fireEvent.click(screen.getByText("Claim link")); fireEvent.click(screen.getByText("Generate"));
  const sent = (screen.getByLabelText("Claim secret") as HTMLInputElement).value;
  fireEvent.click(screen.getByRole("button", { name: "Create claim link" }));
  await waitFor(() => expect(screen.getByLabelText("Created claim secret")).toHaveValue(sent));
  expect(screen.getByLabelText("Claim secret")).toHaveValue(""); expect(screen.getByRole("button", { name: "Create claim link" })).toBeDisabled();
});
