import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it } from "vitest";

import { OPEN_SHORTCUTS_EVENT, ShortcutsDialog, shortcutGroups } from "./shortcuts-dialog";

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

describe("shortcutGroups", () => {
  it("uses the platform modifier for combinations", () => {
    const rows = shortcutGroups("⌘").flatMap((group) => group.rows);
    expect(rows.find((row) => row.label === "Search threads")?.combos).toEqual([["⌘", "K"], ["/"]]);
    expect(shortcutGroups("Ctrl").flatMap((group) => group.rows).find((row) => row.label === "Post your comment")?.combos).toEqual([
      ["Ctrl", "↵"],
    ]);
  });

  it("has unique labels so rows key and read unambiguously", () => {
    const labels = shortcutGroups("⌘").flatMap((group) => group.rows.map((row) => row.label));
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("ShortcutsDialog", () => {
  it("opens on ? and closes with Done", async () => {
    render(<ShortcutsDialog />);
    expect(isOpen()).toBe(false);
    fireEvent.keyDown(document.body, { key: "?", shiftKey: true });
    expect(isOpen()).toBe(true);
    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toHaveAccessibleDescription(
      "Get around the forum without leaving the keyboard.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(isOpen()).toBe(false);
  });

  it("closes on a backdrop press but not on a drag that starts inside", () => {
    render(<ShortcutsDialog />);
    window.dispatchEvent(new Event(OPEN_SHORTCUTS_EVENT));
    const dialog = document.querySelector("dialog")!;
    fireEvent.pointerDown(screen.getByText("Search threads"));
    fireEvent.click(dialog);
    expect(isOpen()).toBe(true);
    fireEvent.pointerDown(dialog);
    fireEvent.click(dialog);
    expect(isOpen()).toBe(false);
  });

  it("does not open over another open dialog", () => {
    render(
      <>
        <dialog open aria-label="other" />
        <ShortcutsDialog />
      </>,
    );
    fireEvent.keyDown(document.body, { key: "?" });
    expect(document.querySelectorAll("dialog[open]")).toHaveLength(1);
  });

  it("groups every shortcut under a labelled section", () => {
    render(<ShortcutsDialog />);
    window.dispatchEvent(new Event(OPEN_SHORTCUTS_EVENT));
    for (const name of ["General", "In search", "Writing"]) {
      expect(screen.getByRole("region", { name })).toBeInTheDocument();
    }
    const row = screen.getByText("Move through results").parentElement!;
    expect(row).toHaveTextContent("↑↓");
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
