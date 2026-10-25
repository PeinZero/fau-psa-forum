import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ErrorPage from "./error";

describe("ErrorPage", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("retries when Try again is clicked", async () => {
    const retry = vi.fn();
    render(<ErrorPage error={new Error("boom")} retry={retry} />);
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("shows the server digest as a reference", () => {
    const error = Object.assign(new Error("boom"), { digest: "abc123" });
    render(<ErrorPage error={error} retry={vi.fn()} />);
    expect(screen.getByText("Reference: abc123")).toBeInTheDocument();
  });

  it("shows no reference without a digest", () => {
    render(<ErrorPage error={new Error("boom")} retry={vi.fn()} />);
    expect(screen.queryByText(/Reference:/)).not.toBeInTheDocument();
  });

  it("logs the error", () => {
    const error = new Error("boom");
    render(<ErrorPage error={error} retry={vi.fn()} />);
    expect(consoleError).toHaveBeenCalledWith(error);
  });

  it("links back to home", () => {
    render(<ErrorPage error={new Error("boom")} retry={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
  });
});
