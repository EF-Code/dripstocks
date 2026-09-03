import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
  it("renders mode tabs and token select", () => {
    render(<CreateStream />);
    expect(screen.getByText("Direct")).toBeDefined();
    expect(screen.getByText("Claim link")).toBeDefined();
    expect(screen.getByText(/Token/)).toBeDefined();
    const text = document.body.textContent || "";
    expect(text.includes("AAPLc")).toBe(true);
  });

  it("shows Sepolia mock label and connect prompt when disconnected", () => {
    render(<CreateStream />);
    const body = document.body.textContent || "";
    expect(body).toMatch(/Sepolia mock/);
    expect(body).toMatch(/Connect a wallet to create a stream/);
  });

  it("claim tab explains secret handling", () => {
    render(<CreateStream />);
    fireEvent.click(screen.getByText("Claim link"));
    const body = document.body.textContent || "";
    expect(body).toMatch(/Generate/);
    expect(body).toMatch(/off-chain only/);
    expect(body).toMatch(/raw email/);
  });

  it("batch tab accepts one address per line", () => {
    render(<CreateStream />);
    fireEvent.click(screen.getByText(/Batch/));
    const body = document.body.textContent || "";
    expect(body).toMatch(/one 0x address per line/);
  });

  it("states Base names are not resolved", () => {
    render(<CreateStream />);
    const body = document.body.textContent || "";
    expect(body).toMatch(/not resolved yet/);
  });
});
