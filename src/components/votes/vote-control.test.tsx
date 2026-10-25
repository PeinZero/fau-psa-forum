import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { castVote, type CastVoteResult } from "./actions";
import { VoteControl } from "./vote-control";

vi.mock("next/navigation", () => ({ usePathname: () => "/t/example" }));
vi.mock("./actions", () => ({ castVote: vi.fn() }));

const cast = vi.mocked(castVote);

beforeEach(() => {
  cast.mockReset();
});

const upvote = () => screen.getByRole("button", { name: "Upvote" });
const downvote = () => screen.getByRole("button", { name: "Downvote" });
const score = () => screen.getByRole("group", { name: "Vote" }).querySelector("[aria-live]")!;

/** A server answer the test releases by hand, to look at the control while the vote is on its way. */
function deferred() {
  let resolve!: (value: CastVoteResult) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<CastVoteResult>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function expectVote(vote: -1 | 0 | 1, points: number) {
  expect(upvote()).toHaveAttribute("aria-pressed", String(vote === 1));
  expect(downvote()).toHaveAttribute("aria-pressed", String(vote === -1));
  expect(score()).toHaveTextContent(new RegExp(`^${points} points?$`));
}

describe("VoteControl", () => {
  it("sends signed-out visitors to the sign-in page, back to the comment", () => {
    render(<VoteControl commentId={7} score={3} myVote={0} signedIn={false} />);
    const href = screen.getByRole("link", { name: "Sign in to upvote" }).getAttribute("href");
    expect(href).toBe(`/login?next=${encodeURIComponent("/t/example#comment-7")}`);
  });

  it("shows the score without voting when disabled", async () => {
    render(<VoteControl commentId={7} score={3} myVote={0} signedIn disabled />);
    expect(upvote()).toBeDisabled();
    expect(downvote()).toBeDisabled();
    expect(screen.getByRole("group", { name: "Vote" })).toHaveAttribute("title", "Voting isn't available on this comment");
  });

  it("updates optimistically and settles on the server's numbers", async () => {
    const answer = deferred();
    cast.mockReturnValue(answer.promise);
    render(<VoteControl commentId={7} score={3} myVote={0} signedIn />);

    await userEvent.click(upvote());
    expect(cast).toHaveBeenCalledWith({ commentId: 7, value: 1 });
    expectVote(1, 4);
    expect(screen.getByRole("group", { name: "Vote" })).toHaveAttribute("aria-busy", "true");

    await act(async () => answer.resolve({ ok: true, score: 6, myVote: 1 }));
    expectVote(1, 6);
    expect(screen.getByRole("group", { name: "Vote" })).not.toHaveAttribute("aria-busy");
  });

  it("removes an upvote when the upvote arrow is clicked again", async () => {
    cast.mockResolvedValueOnce({ ok: true, score: 1, myVote: 1 }).mockResolvedValueOnce({ ok: true, score: 0, myVote: 0 });
    render(<VoteControl commentId={7} score={0} myVote={0} signedIn />);

    await userEvent.click(upvote());
    expectVote(1, 1);
    await userEvent.click(upvote());
    expect(cast).toHaveBeenLastCalledWith({ commentId: 7, value: 0 });
    expectVote(0, 0);
  });

  it.each([
    { name: "0 → 1", from: 0, start: 3, click: "up", sent: 1, after: 4 },
    { name: "1 → 0", from: 1, start: 4, click: "up", sent: 0, after: 3 },
    { name: "1 → -1", from: 1, start: 4, click: "down", sent: -1, after: 2 },
    { name: "-1 → 0", from: -1, start: 2, click: "down", sent: 0, after: 3 },
    { name: "-1 → 1", from: -1, start: 2, click: "up", sent: 1, after: 4 },
    { name: "0 → -1", from: 0, start: 3, click: "down", sent: -1, after: 2 },
  ] as const)("$name sends the new vote and moves the score", async ({ from, start, click, sent, after }) => {
    cast.mockReturnValue(new Promise(() => {}));
    render(<VoteControl commentId={7} score={start} myVote={from} signedIn />);
    await userEvent.click(click === "up" ? upvote() : downvote());
    expect(cast).toHaveBeenCalledWith({ commentId: 7, value: sent });
    expectVote(sent, after);
  });

  it("takes a second click while the first vote is still on its way and settles on the newest answer", async () => {
    const first = deferred();
    const second = deferred();
    cast.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    render(<VoteControl commentId={7} score={5} myVote={0} signedIn />);

    await userEvent.click(upvote());
    await userEvent.click(upvote());
    expect(cast.mock.calls).toEqual([[{ commentId: 7, value: 1 }], [{ commentId: 7, value: 0 }]]);
    expectVote(0, 5);

    // The older answer must not pull the control back to the upvote.
    await act(async () => first.resolve({ ok: true, score: 6, myVote: 1 }));
    expectVote(0, 5);
    await act(async () => second.resolve({ ok: true, score: 5, myVote: 0 }));
    expectVote(0, 5);
  });

  it("rolls back and shows the message when the vote is rejected", async () => {
    cast.mockResolvedValue({ ok: false, message: "You can't vote on your own comment." });
    render(<VoteControl commentId={7} score={3} myVote={0} signedIn />);

    await userEvent.click(upvote());
    expect(await screen.findByRole("alert")).toHaveTextContent("You can't vote on your own comment.");
    expectVote(0, 3);
  });

  it("rolls back to the last vote the server accepted", async () => {
    cast.mockResolvedValueOnce({ ok: true, score: 4, myVote: 1 }).mockResolvedValueOnce({ ok: false, message: "Voting is closed for this comment." });
    render(<VoteControl commentId={7} score={3} myVote={0} signedIn />);

    await userEvent.click(upvote());
    await userEvent.click(downvote());
    expect(await screen.findByRole("alert")).toHaveTextContent("Voting is closed for this comment.");
    expectVote(1, 4);
  });

  it("rolls back when the request itself fails, and clears the message on the next try", async () => {
    cast.mockRejectedValueOnce(new Error("Failed to fetch")).mockResolvedValueOnce({ ok: true, score: 2, myVote: -1 });
    render(<VoteControl commentId={7} score={3} myVote={0} signedIn />);

    await userEvent.click(upvote());
    expect(await screen.findByRole("alert")).toHaveTextContent("Your vote didn't go through. Please try again.");
    expectVote(0, 3);

    await userEvent.click(downvote());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expectVote(-1, 2);
  });

  it("takes fresher numbers from a server re-render", () => {
    const { rerender } = render(<VoteControl commentId={7} score={3} myVote={0} signedIn />);
    rerender(<VoteControl commentId={7} score={9} myVote={-1} signedIn />);
    expectVote(-1, 9);
  });

  it("votes through onVote for threads", async () => {
    const onVote = vi.fn().mockResolvedValue({ ok: true, score: 1, myVote: 1 });
    render(<VoteControl onVote={onVote} score={0} myVote={0} signedIn appearance="pill" />);
    await userEvent.click(upvote());
    expect(onVote).toHaveBeenCalledWith(1);
    expect(cast).not.toHaveBeenCalled();
    expectVote(1, 1);
  });
});

describe("VoteControl look", () => {
  it("fills the up arrow and colours the score with the accent once upvoted", () => {
    render(<VoteControl commentId={7} score={3} myVote={1} signedIn />);
    expect(upvote()).toHaveClass("text-accent");
    expect(upvote().querySelector("svg")).toHaveAttribute("fill", "currentColor");
    expect(downvote().querySelector("svg")).toHaveAttribute("fill", "none");
    expect(score()).toHaveClass("text-accent");
  });

  it("fills the down arrow and colours the score as danger once downvoted", () => {
    render(<VoteControl commentId={7} score={-2} myVote={-1} signedIn />);
    expect(downvote()).toHaveClass("text-danger");
    expect(downvote().querySelector("svg")).toHaveAttribute("fill", "currentColor");
    expect(upvote().querySelector("svg")).toHaveAttribute("fill", "none");
    expect(score()).toHaveClass("text-danger");
  });

  it("stays neutral without a vote", () => {
    render(<VoteControl commentId={7} score={0} myVote={0} signedIn />);
    expect(score()).toHaveClass("text-foreground");
    expect(upvote()).toHaveClass("text-muted");
    expect(downvote()).toHaveClass("text-muted");
  });

  it("keeps 32px arrows for a mouse and 44px for touch, and reserves room for the score", () => {
    render(<VoteControl commentId={7} score={0} myVote={0} signedIn />);
    expect(upvote()).toHaveClass("size-8", "pointer-coarse:size-11");
    expect(score()).toHaveClass("min-w-[3ch]", "tabular-nums");
  });

  it("tints the pill once the visitor has upvoted", () => {
    render(<VoteControl commentId={7} score={3} myVote={1} signedIn appearance="pill" />);
    const group = screen.getByRole("group", { name: "Vote" });
    expect(group).toHaveClass("rounded-full", "bg-accent-soft");
    expect(group).not.toHaveClass("bg-surface");
  });

  it("tints the pill as danger once the visitor has downvoted", () => {
    render(<VoteControl commentId={7} score={3} myVote={-1} signedIn appearance="pill" />);
    expect(screen.getByRole("group", { name: "Vote" })).toHaveClass("bg-danger/10");
  });

  it("stays neutral without a vote, also for visitors who are signed out", () => {
    render(<VoteControl commentId={7} score={0} myVote={0} signedIn={false} appearance="pill" />);
    const group = screen.getByRole("group", { name: "Vote" });
    expect(group).toHaveClass("rounded-full", "bg-surface");
    expect(group).not.toHaveClass("bg-accent-soft");
  });
});
