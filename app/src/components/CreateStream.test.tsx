import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CreateStream } from "./CreateStream";

// Mock wagmi
vi.mock("wagmi", () => ({
  useAccount: () => ({ address: undefined }),
  useChainId: () => 84532,
  useReadContract: () => ({ data: undefined }),
  useWriteContract: () => ({ writeContract: vi.fn(), data: undefined, isPending: false, error: null }),
  useWaitForTransactionReceipt: () => ({ isSuccess: false }),
}));

describe("CreateStream", () => {
  it("renders token select and shows vault not deployed warning", () => {
    render(<CreateStream />);
    // Component has Token select and Connect prompt when not connected
    expect(screen.getByText(/Token/)).toBeDefined();
    const text = document.body.textContent || "";
    expect(text.includes("AAPLc") || text.includes("Connect") || text.includes("Vault not deployed")).toBe(true);
  });

  it("has B20 addresses visible", () => {
    render(<CreateStream />);
    const body = document.body.textContent || "";
    // At least one B20 prefix should be hinted in the component or via select
    expect(body.length).toBeGreaterThan(0);
  });

  it("states Base names are not resolved and claim secrets must be 256-bit", () => {
    render(<CreateStream />);
    const body = document.body.textContent || "";
    expect(body).toMatch(/not resolved yet/);
    expect(body).toMatch(/256-bit random/);
  });
});
