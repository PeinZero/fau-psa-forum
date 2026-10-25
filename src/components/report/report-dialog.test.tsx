import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { reportContent } from "@/components/report/actions";

import { ReportDialog } from "./report-dialog";

vi.mock("@/components/report/actions", () => ({ reportContent: vi.fn() }));

const target = { commentId: 7 };

function setup() {
  const onClose = vi.fn();
  render(<ReportDialog target={target} subject="comment" open onClose={onClose} />);
  return onClose;
}

describe("ReportDialog", () => {
  beforeAll(() => {
    // jsdom does not implement the modal dialog API.
    HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
      this.removeAttribute("open");
    };
  });

  beforeEach(() => vi.mocked(reportContent).mockReset());

  it("shows the title and description", () => {
    setup();
    expect(screen.getByRole("heading", { name: "Report this comment" })).toBeInTheDocument();
    expect(screen.getByText("Only moderators see reports. Pick the reason that fits best.")).toBeInTheDocument();
  });

  it("requires a reason", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Submit report" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Please choose a reason.");
    expect(reportContent).not.toHaveBeenCalled();
  });

  it("submits the reason with empty details as undefined", async () => {
    vi.mocked(reportContent).mockResolvedValue({ ok: true });
    setup();
    await userEvent.click(screen.getByRole("radio", { name: "Spam" }));
    await userEvent.type(screen.getByLabelText("Details (optional)"), "   ");
    await userEvent.click(screen.getByRole("button", { name: "Submit report" }));
    expect(reportContent).toHaveBeenCalledWith({ target, reason: "spam", details: undefined });
  });

  it("sends trimmed details", async () => {
    vi.mocked(reportContent).mockResolvedValue({ ok: true });
    setup();
    await userEvent.click(screen.getByRole("radio", { name: "Offensive or abusive" }));
    await userEvent.type(screen.getByLabelText("Details (optional)"), "  rude  ");
    await userEvent.click(screen.getByRole("button", { name: "Submit report" }));
    expect(reportContent).toHaveBeenCalledWith({ target, reason: "offensive", details: "rude" });
  });

  it("thanks the reporter and closes with Done", async () => {
    vi.mocked(reportContent).mockResolvedValue({ ok: true });
    const onClose = setup();
    await userEvent.click(screen.getByRole("radio", { name: "Spam" }));
    await userEvent.click(screen.getByRole("button", { name: "Submit report" }));
    expect(await screen.findByRole("heading", { name: "Thanks for reporting" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows an error result", async () => {
    vi.mocked(reportContent).mockResolvedValue({ ok: false, message: "Please sign in to report." });
    setup();
    await userEvent.click(screen.getByRole("radio", { name: "Spam" }));
    await userEvent.click(screen.getByRole("button", { name: "Submit report" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Please sign in to report.");
    expect(screen.queryByText("Thanks for reporting")).not.toBeInTheDocument();
  });

  it("shows the details counter only near the limit", async () => {
    setup();
    const details = screen.getByLabelText("Details (optional)");
    await userEvent.type(details, "short");
    expect(screen.queryByText(/characters left/)).not.toBeInTheDocument();
    await userEvent.clear(details);
    await userEvent.click(details);
    await userEvent.paste("a".repeat(480));
    expect(screen.getByText("20 characters left")).toBeInTheDocument();
  });

  it("closes on Cancel", async () => {
    const onClose = setup();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
