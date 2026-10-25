import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { sendFeedback } from "./actions";
import { FeedbackDialog } from "./feedback-button";
import { FEEDBACK_MESSAGE_MAX } from "./limits";

vi.mock("./actions", () => ({ sendFeedback: vi.fn() }));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

beforeEach(() => vi.mocked(sendFeedback).mockReset());

describe("FeedbackDialog", () => {
  it("has a title and a description line", () => {
    render(<FeedbackDialog open onClose={() => {}} />);
    expect(screen.getByRole("dialog", { name: "Send feedback" })).toHaveAccessibleDescription(
      "Something confusing, broken or missing? Tell us. Only moderators read this.",
    );
  });

  it("asks for a message before sending", async () => {
    render(<FeedbackDialog open onClose={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Send feedback" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Please write a few words first.");
    expect(sendFeedback).not.toHaveBeenCalled();
  });

  it("shows the counter only near the limit", async () => {
    render(<FeedbackDialog open onClose={() => {}} />);
    const field = screen.getByLabelText("Your feedback");
    await userEvent.type(field, "Short note");
    expect(screen.queryByText(/characters left/)).not.toBeInTheDocument();
    await userEvent.clear(field);
    await userEvent.click(field);
    await userEvent.paste("a".repeat(FEEDBACK_MESSAGE_MAX - 50));
    expect(screen.getByText("50 characters left")).toBeInTheDocument();
  });

  it("sends the message with the page and thanks the sender", async () => {
    vi.mocked(sendFeedback).mockResolvedValue({ ok: true, message: "Thanks!" });
    render(<FeedbackDialog open onClose={() => {}} />);
    await userEvent.type(screen.getByLabelText("Your feedback"), "The search box is hard to find");
    await userEvent.click(screen.getByRole("button", { name: "Send feedback" }));
    expect(sendFeedback).toHaveBeenCalledWith({ message: "The search box is hard to find", page: "/" });
    expect(await screen.findByRole("status")).toHaveTextContent("Thanks for the feedback");
  });

  it("shows a failed send", async () => {
    vi.mocked(sendFeedback).mockResolvedValue({ ok: false, message: "Please sign in to send feedback." });
    render(<FeedbackDialog open onClose={() => {}} />);
    await userEvent.type(screen.getByLabelText("Your feedback"), "Hello there");
    await userEvent.click(screen.getByRole("button", { name: "Send feedback" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Please sign in to send feedback.");
  });
});
