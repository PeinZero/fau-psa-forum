import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { Dialog, DialogActions, DialogHeader, DialogSuccess } from "./dialog";

beforeAll(() => {
  // jsdom lacks the modal dialog API.
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

function NameForm() {
  const [done, setDone] = useState(false);
  if (done) return <DialogSuccess title="Saved">Your name is on file.</DialogSuccess>;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setDone(true);
      }}
      className="flex flex-col gap-5"
    >
      <DialogHeader title="Your name" description="Shown next to your threads." />
      <label>
        Name
        <input name="name" />
      </label>
      <DialogActions>
        <button type="button">Cancel</button>
        <button type="submit">Save</button>
      </DialogActions>
    </form>
  );
}

/** Opens from a real trigger, so focus return can be checked. */
function Harness({ onClose = () => {} }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <Dialog
        open={open}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
      >
        <NameForm />
      </Dialog>
    </>
  );
}

async function openHarness(onClose?: () => void) {
  render(<Harness onClose={onClose} />);
  await userEvent.click(screen.getByRole("button", { name: "Open" }));
  return document.querySelector("dialog")!;
}

describe("Dialog", () => {
  it("renders nothing inside while closed", () => {
    render(<Harness />);
    expect(document.querySelector("dialog")).not.toHaveAttribute("open");
    expect(screen.queryByText("Your name")).not.toBeInTheDocument();
  });

  it("is named and described by its header", async () => {
    await openHarness();
    expect(screen.getByRole("dialog", { name: "Your name" })).toHaveAccessibleDescription("Shown next to your threads.");
  });

  it("focuses the first field, not the close button", async () => {
    await openHarness();
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveFocus();
  });

  it("closes on Escape and returns focus to the opener", async () => {
    const onClose = vi.fn();
    const dialog = await openHarness(onClose);
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(dialog).not.toHaveAttribute("open");
    expect(screen.getByRole("button", { name: "Open" })).toHaveFocus();
  });

  it("closes with the close button", async () => {
    const onClose = vi.fn();
    await openHarness(onClose);
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on a backdrop press but not on a drag that starts inside", async () => {
    const onClose = vi.fn();
    const dialog = await openHarness(onClose);
    fireEvent.pointerDown(screen.getByText("Your name"));
    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.pointerDown(dialog);
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps Tab inside the dialog", async () => {
    await openHarness();
    screen.getByRole("button", { name: "Save" }).focus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole("button", { name: "Save" })).toHaveFocus();
  });

  it("puts the actions in a right-aligned row", async () => {
    await openHarness();
    expect(screen.getByRole("button", { name: "Save" }).parentElement).toHaveClass("justify-end");
  });

  it("swaps to the success panel with a focused Done button that closes", async () => {
    const onClose = vi.fn();
    await openHarness(onClose);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("status")).toHaveTextContent("Your name is on file.");
    expect(screen.getByRole("dialog", { name: "Saved" })).toBeInTheDocument();
    const done = screen.getByRole("button", { name: "Done" });
    expect(done).toHaveFocus();
    await userEvent.click(done);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("starts fresh when opened again", async () => {
    await openHarness();
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByRole("textbox", { name: "Name" })).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("refuses parts rendered outside a dialog", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<DialogHeader title="Lost" />)).toThrow("Dialog parts must sit inside <Dialog>.");
  });
});
