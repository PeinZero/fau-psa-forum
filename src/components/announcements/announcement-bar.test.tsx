import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const fetchLatest = vi.hoisted(() => vi.fn());
vi.mock("@/components/sidebar/data", () => ({ fetchLatestAnnouncements: fetchLatest }));

import { AnnouncementBar } from "./announcement-bar";
import { DISMISSED_KEY, dismissedScript } from "./announcement-bar-storage";

const lead = (overrides = {}) => ({ id: 7, title: "Welcome evening on 3 November", is_pinned: true, created_at: "", body: "", ...overrides });
const mount = async (items: unknown[]) => {
  fetchLatest.mockResolvedValue({ items, fetchedAt: 0 });
  return render(await AnnouncementBar());
};

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.useRealTimers());

describe("AnnouncementBar", () => {
  it("renders the tag, title and a Read link to the announcement", async () => {
    await mount([lead()]);
    const link = screen.getByRole("link", { name: /Welcome evening on 3 November/ });
    expect(link).toHaveAttribute("href", "/announcements/7");
    expect(link).toHaveTextContent("Pinned");
    expect(link).toHaveTextContent("Read");
    expect(within(link).getByText("Welcome evening on 3 November")).toHaveClass("truncate");
  });

  it("tags an unpinned announcement as New", async () => {
    await mount([lead({ is_pinned: false })]);
    expect(screen.getByRole("link")).toHaveTextContent("New");
  });

  it("renders nothing without an announcement", async () => {
    const { container } = await mount([]);
    expect(container).toBeEmptyDOMElement();
  });

  it("hides on dismiss and remembers the id", async () => {
    vi.useFakeTimers();
    await mount([lead()]);
    fireEvent.click(screen.getByRole("button", { name: "Dismiss announcement" }));
    expect(screen.queryByRole("link")).toBeNull();
    expect(JSON.parse(window.localStorage.getItem(DISMISSED_KEY) ?? "[]")).toEqual([7]);
    act(() => void vi.advanceTimersByTime(250));
    expect(document.getElementById("announcement-bar")).toBeNull();
  });

  it("stays hidden for a stored id", async () => {
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify([7]));
    await mount([lead()]);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("shows a different announcement than the dismissed one", async () => {
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify([6]));
    await mount([lead()]);
    expect(screen.getByRole("link")).toBeInTheDocument();
  });

  it("ignores corrupt storage", async () => {
    window.localStorage.setItem(DISMISSED_KEY, "{nope");
    await mount([lead()]);
    expect(screen.getByRole("link")).toBeInTheDocument();
  });

  it("ships a pre-paint script that marks a dismissed bar", async () => {
    const { container } = await mount([lead()]);
    expect(container.querySelector("script")?.innerHTML).toBe(dismissedScript(7));
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify([7]));
    new Function(dismissedScript(7))();
    expect(document.getElementById("announcement-bar")).toHaveAttribute("data-dismissed");
  });
});
