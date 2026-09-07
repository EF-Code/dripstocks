import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LegacyPage from "./page";

const state = vi.hoisted(() => ({ dashboard: vi.fn() }));

vi.mock("@/components/WalletControls", () => ({
  WalletButton: () => <button>Connect wallet</button>,
  ChainBanner: () => null,
}));

vi.mock("@/components/StreamDashboard", () => ({
  StreamDashboard: (props: unknown) => {
    state.dashboard(props);
    return <div>Legacy stream dashboard</div>;
  },
}));

beforeEach(() => state.dashboard.mockReset());

describe("LegacyPage", () => {
  it("mounts the original vault with claim controls disabled", () => {
    render(<LegacyPage />);
    expect(screen.getByText("Legacy stream dashboard")).toBeVisible();
    expect(state.dashboard).toHaveBeenCalledWith({
      vaultAddress: "0x50e9DFD093F5E98AE1e1FC7AF4F87e5650000C49",
      claimsEnabled: false,
    });
    expect(screen.queryByText(/private-key/)).toBeNull();
    expect(screen.getByText(/deletes a claim-hash reservation/)).toBeVisible();
  });
});
