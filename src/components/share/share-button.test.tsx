import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ShareButton } from "./share-button";

const props = { url: "https://forum.test/t/abc", title: "Abc" };

function setNav(value: Partial<Navigator>) {
  Object.defineProperty(window, "navigator", { configurable: true, value: { ...value } });
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

  it("uses the native share sheet when present", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setNav({ share });
    render(<ShareButton {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(share).toHaveBeenCalledWith(props);
  });

  it("ignores a cancelled share", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("x", "AbortError"));
    setNav({ share });
    render(<ShareButton {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("falls back to a selectable input when the clipboard fails", async () => {
    setNav({ clipboard: { writeText: vi.fn().mockRejectedValue(new Error("no")) } as unknown as Clipboard });
    render(<ShareButton {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Share" }));
    expect(await screen.findByRole("textbox", { name: "Thread link" })).toHaveValue(props.url);
  });
});
