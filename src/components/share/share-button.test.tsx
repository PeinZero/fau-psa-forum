import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ShareButton } from "./share-button";

const props = { url: "https://forum.test/t/abc", title: "Abc" };

function setNav(value: Partial<Navigator>) {
  Object.defineProperty(window, "navigator", { configurable: true, value: { ...value } });
}

function setCoarsePointer(coarse: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) => ({ matches: coarse && query === "(pointer: coarse)", media: query }) as MediaQueryList,
  );
}

describe("ShareButton", () => {
  afterEach(() => vi.restoreAllMocks());

  it("copies the url and announces it when share is unavailable", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNav({ clipboard: { writeText } as unknown as Clipboard });
    render(<ShareButton {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(writeText).toHaveBeenCalledWith(props.url);
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Link copied");
  });

  it("uses the native share sheet on touch devices", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setNav({ share });
    setCoarsePointer(true);
    render(<ShareButton {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(share).toHaveBeenCalledWith(props);
  });

  it("ignores a cancelled share", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("x", "AbortError"));
    setNav({ share });
    setCoarsePointer(true);
    render(<ShareButton {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("copies on desktop even when the browser offers a share sheet", async () => {
    const share = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNav({ share, clipboard: { writeText } as unknown as Clipboard });
    setCoarsePointer(false);
    render(<ShareButton {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(share).not.toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith(props.url);
  });

  it("returns to Share after the copied feedback", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setNav({ clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } as unknown as Clipboard });
    render(<ShareButton {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(await screen.findByRole("button", { name: "Copied" })).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(2000));
    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("");
    vi.useRealTimers();
  });

  it("keeps both labels in the button so its width never changes", () => {
    render(<ShareButton {...props} />);
    const button = screen.getByRole("button", { name: "Share" });
    expect(button).toHaveTextContent("ShareCopied");
  });

  it("falls back to a selectable input when the clipboard fails", async () => {
    setNav({ clipboard: { writeText: vi.fn().mockRejectedValue(new Error("no")) } as unknown as Clipboard });
    render(<ShareButton {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(await screen.findByRole("textbox", { name: "Thread link" })).toHaveValue(props.url);
    expect(screen.getByRole("status")).toHaveTextContent("Copy the thread link from the field");
  });
});
