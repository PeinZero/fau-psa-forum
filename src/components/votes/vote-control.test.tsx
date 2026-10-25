import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { castVote } from "./actions";
import { VoteControl } from "./vote-control";

vi.mock("next/navigation", () => ({ usePathname: () => "/t/example" }));
vi.mock("./actions", () => ({ castVote: vi.fn() }));

const cast = vi.mocked(castVote);

beforeEach(() => cast.mockReset());

describe("VoteControl", () => {
  it("sends signed-out visitors to the sign-in page, back to the comment", () => {
    render(<VoteControl commentId={7} score={3} myVote={0} signedIn={false} />);
    const href = screen.getByRole("link", { name: "Sign in to upvote" }).getAttribute("href");
    expect(href).toBe(`/login?next=${encodeURIComponent("/t/example#comment-7")}`);
  });

  it("shows the score without voting when disabled", () => {
    render(<VoteControl commentId={7} score={3} myVote={0} signedIn disabled />);
    expect(screen.getByRole("button", { name: "Upvote" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Downvote" })).toBeDisabled();
  });

  it("updates optimistically and settles on the server's numbers", async () => {
    let resolve!: (value: Awaited<ReturnType<typeof castVote>>) => void;
    cast.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<VoteControl commentId={7} score={3} myVote={0} signedIn />);

    await userEvent.click(screen.getByRole("button", { name: "Upvote" }));
    expect(cast).toHaveBeenCalledWith({ commentId: 7, value: 1 });
    expect(screen.getByRole("button", { name: "Upvote" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("4")).toBeInTheDocument();

    await act(async () => resolve({ ok: true, score: 6, myVote: 1 }));
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upvote" })).toHaveAttribute("aria-pressed", "true");
  });

  it("rolls back and shows the message when the vote is rejected", async () => {
    cast.mockResolvedValue({ ok: false, message: "You can't vote on your own comment." });
    render(<VoteControl commentId={7} score={3} myVote={0} signedIn />);

    await userEvent.click(screen.getByRole("button", { name: "Upvote" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("You can't vote on your own comment.");
    expect(screen.getByRole("button", { name: "Upvote" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("withdraws an existing vote and flips a vote in one step", async () => {
    cast.mockResolvedValue({ ok: true, score: 2, myVote: 0 });
    render(<VoteControl commentId={7} score={3} myVote={1} signedIn />);
    await userEvent.click(screen.getByRole("button", { name: "Upvote" }));
    expect(cast).toHaveBeenLastCalledWith({ commentId: 7, value: 0 });

    cast.mockResolvedValue({ ok: true, score: 0, myVote: -1 });
    await userEvent.click(screen.getByRole("button", { name: "Downvote" }));
    expect(cast).toHaveBeenLastCalledWith({ commentId: 7, value: -1 });
  });
});

describe("VoteControl pill", () => {
  it("tints the pill once the visitor has upvoted", () => {
    render(<VoteControl commentId={7} score={3} myVote={1} signedIn appearance="pill" />);
    const group = screen.getByRole("group", { name: "Vote" });
    expect(group).toHaveClass("rounded-full", "bg-accent-soft");
    expect(group).not.toHaveClass("bg-surface");
  });

  it("stays neutral without a vote, also for visitors who are signed out", () => {
    render(<VoteControl commentId={7} score={0} myVote={0} signedIn={false} appearance="pill" />);
    const group = screen.getByRole("group", { name: "Vote" });
    expect(group).toHaveClass("rounded-full", "bg-surface");
    expect(group).not.toHaveClass("bg-accent-soft");
  });
});
