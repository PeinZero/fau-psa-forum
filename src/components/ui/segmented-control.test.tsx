import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SegmentedControl } from "./segmented-control";

const options = [
  { value: "write", label: "Write" },
  { value: "preview", label: "Preview" },
] as const;

describe("SegmentedControl", () => {
  it("marks only the current option as pressed", () => {
    render(<SegmentedControl label="Mode" value="preview" options={options} onChange={() => {}} />);
    expect(screen.getByRole("group", { name: "Mode" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Write" })).toHaveAttribute("aria-pressed", "false");
  });

  it("reports the chosen value", async () => {
    const onChange = vi.fn();
    render(<SegmentedControl label="Mode" value="write" options={options} onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(onChange).toHaveBeenCalledWith("preview");
  });
});
