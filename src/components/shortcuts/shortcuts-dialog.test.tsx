import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";

import { OPEN_SHORTCUTS_EVENT, ShortcutsDialog } from "./shortcuts-dialog";

beforeAll(() => {
  // jsdom lacks the modal dialog API.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

const isOpen = () => document.querySelector("dialog")!.hasAttribute("open");

describe("ShortcutsDialog", () => {
  it("opens on ? and closes with the close button", async () => {
    render(<ShortcutsDialog />);
    expect(isOpen()).toBe(false);
    fireEvent.keyDown(document.body, { key: "?", shiftKey: true });
    expect(isOpen()).toBe(true);
    expect(screen.getByRole("heading", { name: "Keyboard shortcuts" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(isOpen()).toBe(false);
  });

  it("ignores ? typed in inputs and with modifiers", () => {
    render(
      <>
        <input aria-label="field" />
        <ShortcutsDialog />
      </>,
    );
    fireEvent.keyDown(screen.getByLabelText("field"), { key: "?" });
    fireEvent.keyDown(document.body, { key: "?", ctrlKey: true });
    expect(isOpen()).toBe(false);
  });

  it("opens from the footer event", () => {
    render(<ShortcutsDialog />);
    window.dispatchEvent(new Event(OPEN_SHORTCUTS_EVENT));
    expect(isOpen()).toBe(true);
  });
});
