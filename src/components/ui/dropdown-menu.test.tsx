import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DropdownMenu } from "./dropdown-menu";

function setup(onDelete = vi.fn()) {
  render(
    <DropdownMenu
      label="Actions"
      items={[{ label: "Edit", onSelect: vi.fn() }, "separator", { label: "Delete", danger: true, onSelect: onDelete }]}
    />,
  );
  return { trigger: screen.getByRole("button", { name: "Actions" }), onDelete };
}

describe("DropdownMenu", () => {
  it("renders nothing without items", () => {
    const { container } = render(<DropdownMenu label="Actions" items={[false, null]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("opens with ArrowDown on the first item and ArrowUp on the last", async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    trigger.focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
  });

  it("moves with arrows (wrapping), Home and End", async () => {
    const user = userEvent.setup();
    setup().trigger.focus();
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("menuitem", { name: "Delete" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveFocus();
  });

  it("closes on Escape and on an outside click", async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    await user.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).toBeNull();
    await user.click(trigger);
    await user.click(document.body);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("runs the selected item and closes", async () => {
    const user = userEvent.setup();
    const { trigger, onDelete } = setup();
    await user.click(trigger);
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("asks for a reason before a confirmed action runs", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <DropdownMenu
        label="Actions"
        items={[{ label: "Hide", onSelect, confirm: { message: "Hide it?", action: "Hide comment", reason: { label: "Reason", max: 200 } } }]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Actions" }));
    await user.click(screen.getByRole("menuitem", { name: "Hide" }));
    expect(onSelect).not.toHaveBeenCalled();
    await user.type(screen.getByLabelText("Reason"), "  spam  ");
    await user.click(screen.getByRole("button", { name: "Hide comment" }));
    expect(onSelect).toHaveBeenCalledWith({ reason: "spam" });
  });
});
