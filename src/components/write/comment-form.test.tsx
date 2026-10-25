import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createCommentAction } from "@/components/write/actions";
import { CommentForm, replyTarget } from "./comment-form";

vi.mock("@/components/write/actions", () => ({ createCommentAction: vi.fn() }));

const create = vi.mocked(createCommentAction);

beforeEach(() => {
  create.mockReset();
  create.mockResolvedValue({ ok: true } as Awaited<ReturnType<typeof createCommentAction>>);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [] }));
});

afterEach(() => vi.unstubAllGlobals());

describe("replyTarget", () => {
  it("extracts the handle from a mention prefill", () => {
    expect(replyTarget("@bilal_k ")).toBe("bilal_k");
    expect(replyTarget("@bilal_k")).toBe("bilal_k");
  });

  it.each(["", "hello", "@ab", "@name more text", "@a".padEnd(23, "b")])("is null for %j", (prefill) => {
    expect(replyTarget(prefill)).toBeNull();
  });
});

describe("CommentForm top-level", () => {
  it("disables posting until there is text", async () => {
    render(<CommentForm threadId={7} />);
    const button = screen.getByRole("button", { name: "Post comment" });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Add a comment"), "Thanks");
    expect(button).toBeEnabled();
  });

  it("posts on Cmd+Enter, confirms and clears", async () => {
    render(<CommentForm threadId={7} />);
    const textarea = screen.getByLabelText("Add a comment");
    await userEvent.type(textarea, "Helpful answer");
    await userEvent.keyboard("{Meta>}{Enter}{/Meta}");
    await waitFor(() => expect(create).toHaveBeenCalledWith(7, "Helpful answer", undefined));
    expect(await screen.findByText("Comment posted")).toBeInTheDocument();
    expect(textarea).toHaveValue("");
  });

  it("posts on Ctrl+Enter", async () => {
    render(<CommentForm threadId={7} />);
    await userEvent.type(screen.getByLabelText("Add a comment"), "Hi");
    await userEvent.keyboard("{Control>}{Enter}{/Control}");
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
  });

  it("does not post an empty or whitespace-only comment", async () => {
    render(<CommentForm threadId={7} />);
    await userEvent.type(screen.getByLabelText("Add a comment"), "   ");
    await userEvent.keyboard("{Meta>}{Enter}{/Meta}");
    expect(create).not.toHaveBeenCalled();
  });

  it("shows the error and keeps the text when posting fails", async () => {
    create.mockResolvedValue({ ok: false, error: "You are posting too fast." } as Awaited<ReturnType<typeof createCommentAction>>);
    render(<CommentForm threadId={7} />);
    const textarea = screen.getByLabelText("Add a comment");
    await userEvent.type(textarea, "Hello");
    await userEvent.click(screen.getByRole("button", { name: "Post comment" }));
    expect(await screen.findByText("You are posting too fast.")).toBeInTheDocument();
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(textarea).toHaveValue("Hello");
    expect(screen.queryByText("Comment posted")).not.toBeInTheDocument();
  });

  it("shows the posting label and makes the textarea read-only while pending", async () => {
    let finish!: () => void;
    create.mockReturnValue(
      new Promise((resolve) => (finish = () => resolve({ ok: true } as Awaited<ReturnType<typeof createCommentAction>>))),
    );
    render(<CommentForm threadId={7} />);
    const textarea = screen.getByLabelText("Add a comment");
    await userEvent.type(textarea, "Hello");
    await userEvent.click(screen.getByRole("button", { name: "Post comment" }));
    expect(await screen.findByRole("button", { name: "Posting…" })).toBeDisabled();
    expect(textarea).toHaveAttribute("readonly");
    await act(async () => finish());
    await screen.findByText("Comment posted");
  });

  it("has no Cancel button without onDone", () => {
    render(<CommentForm threadId={7} />);
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });
});

describe("CommentForm reply", () => {
  it("labels the textarea with who is being replied to", () => {
    render(<CommentForm threadId={7} parentId={3} initialValue="@bilal_k " />);
    const textarea = screen.getByLabelText(/Replying to @bilal_k/);
    expect(textarea).toHaveValue("@bilal_k ");
    expect(screen.getByText("Replying to", { exact: false })).toBeVisible();
  });

  it("falls back to a screen-reader label without a handle prefill", () => {
    render(<CommentForm threadId={7} parentId={3} />);
    expect(screen.getByLabelText("Write a reply")).toBeInTheDocument();
  });

  it("keeps Reply disabled while only the prefill is present", async () => {
    render(<CommentForm threadId={7} parentId={3} initialValue="@bilal_k " />);
    const button = screen.getByRole("button", { name: "Reply" });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByRole("combobox"), "agreed");
    expect(button).toBeEnabled();
  });

  it("posts with the parent id and calls onDone instead of clearing", async () => {
    const onDone = vi.fn();
    render(<CommentForm threadId={7} parentId={3} initialValue="@bilal_k " onDone={onDone} />);
    await userEvent.type(screen.getByRole("combobox"), "agreed");
    await userEvent.click(screen.getByRole("button", { name: "Reply" }));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(create).toHaveBeenCalledWith(7, "@bilal_k agreed", 3);
    expect(screen.queryByText("Comment posted")).not.toBeInTheDocument();
  });

  it("calls onDone on Escape and on Cancel", async () => {
    const onDone = vi.fn();
    render(<CommentForm threadId={7} parentId={3} onDone={onDone} />);
    await userEvent.type(screen.getByRole("combobox"), "{Escape}");
    expect(onDone).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onDone).toHaveBeenCalledTimes(2);
  });

  it("ignores Escape when there is no onDone", async () => {
    render(<CommentForm threadId={7} parentId={3} />);
    await userEvent.type(screen.getByRole("combobox"), "{Escape}");
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("focuses the textarea with the caret at the end when autoFocus is set", () => {
    render(<CommentForm threadId={7} parentId={3} initialValue="@bilal_k " autoFocus />);
    const textarea = screen.getByRole("combobox") as HTMLTextAreaElement;
    expect(textarea).toHaveFocus();
    expect(textarea.selectionStart).toBe(textarea.value.length);
  });
});

describe("CommentForm counter", () => {
  it("is hidden for short text", async () => {
    render(<CommentForm threadId={7} />);
    await userEvent.type(screen.getByLabelText("Add a comment"), "short");
    expect(screen.queryByText(/characters? left/)).not.toBeInTheDocument();
  });

  it("appears near the 5000 character limit", () => {
    render(<CommentForm threadId={7} />);
    fireEvent.change(screen.getByLabelText("Add a comment"), { target: { value: "x".repeat(4900) } });
    expect(screen.getByText("100 characters left")).toBeInTheDocument();
  });
});
