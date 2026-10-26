import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RestrictControls } from "./restrict-controls";

vi.mock("./actions", () => ({ restrictUser: vi.fn(), liftRestriction: vi.fn() }));

const base = { target: "u1", name: "Sana", active: [], canRestrict: true, canBan: true };

describe("RestrictControls", () => {
  it("offers Restrict for a member", () => {
    render(<RestrictControls {...base} targetRole="member" />);
    expect(screen.getByRole("button", { name: "Restrict" })).toBeTruthy();
    expect(screen.queryByText(/can't be muted or banned/)).toBeNull();
  });

  it("explains instead of offering Restrict for a moderator", () => {
    render(<RestrictControls {...base} targetRole="moderator" />);
    expect(screen.queryByRole("button", { name: "Restrict" })).toBeNull();
    expect(screen.getByText("Moderators can't be muted or banned. Remove the role first.")).toBeTruthy();
  });

  it("offers nothing for the superadmin", () => {
    render(<RestrictControls {...base} targetRole="superadmin" />);
    expect(screen.queryByRole("button", { name: "Restrict" })).toBeNull();
  });
});
