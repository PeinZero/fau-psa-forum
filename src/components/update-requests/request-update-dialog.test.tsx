import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { requestUpdate } from "./actions";
import { UPDATE_NOTE_MAX } from "./limits";
import { RequestUpdateDialog } from "./request-update-dialog";

vi.mock("./actions", () => ({ requestUpdate: vi.fn() }));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

beforeEach(() => vi.mocked(requestUpdate).mockReset());

describe("RequestUpdateDialog", () => {
  it("has a title and a description line", () => {
    render(<RequestUpdateDialog threadId={4} open onClose={() => {}} />);
    expect(screen.getByRole("dialog", { name: "Request an update" })).toHaveAccessibleDescription(
      "Tell the moderators if something here has changed, e.g. a new form, fee or office address.",
    );
  });

  it("shows the counter only near the limit", async () => {
    render(<RequestUpdateDialog threadId={4} open onClose={() => {}} />);
    const note = screen.getByLabelText("What changed? (optional)");
    await userEvent.type(note, "New fee");
    expect(screen.queryByText(/characters left/)).not.toBeInTheDocument();
    await userEvent.clear(note);
    await userEvent.click(note);
    await userEvent.paste("a".repeat(UPDATE_NOTE_MAX - 1));
    expect(screen.getByText("1 character left")).toBeInTheDocument();
  });

  it("sends a blank note as undefined and a filled one trimmed", async () => {
    vi.mocked(requestUpdate).mockResolvedValue({ ok: true });
    const { unmount } = render(<RequestUpdateDialog threadId={4} open onClose={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Send request" }));
    expect(requestUpdate).toHaveBeenLastCalledWith({ threadId: 4, note: undefined });
    expect(await screen.findByRole("status")).toHaveTextContent("Thanks, request sent");
    unmount();

    render(<RequestUpdateDialog threadId={4} open onClose={() => {}} />);
    await userEvent.type(screen.getByLabelText("What changed? (optional)"), "  fee is now 110 EUR  ");
    await userEvent.click(screen.getByRole("button", { name: "Send request" }));
    expect(requestUpdate).toHaveBeenLastCalledWith({ threadId: 4, note: "fee is now 110 EUR" });
  });

  it("shows a failed request", async () => {
    vi.mocked(requestUpdate).mockResolvedValue({ ok: false, message: "You already asked for an update." });
    render(<RequestUpdateDialog threadId={4} open onClose={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Send request" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("You already asked for an update.");
  });
});
