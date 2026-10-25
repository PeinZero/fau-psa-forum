import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { OPEN_COMMAND_PALETTE } from "@/components/command/command-palette";

import { MobileNavDrawer } from "./mobile-nav";
import { navItems } from "./nav-links";

vi.mock("@/components/announcements/unseen-badge", () => ({ UnseenAnnouncementsBadge: () => null }));

beforeAll(() => {
  // jsdom lacks the modal dialog API.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

const isOpen = () => document.querySelector("dialog")!.hasAttribute("open");
const activeHref = (path: string) => navItems.find((item) => item.matches(path))?.href;

describe("navItems", () => {
  it("marks Browse for browse pages and category pages", () => {
    expect(activeHref("/browse")).toBe("/browse");
    expect(activeHref("/browse/popular")).toBe("/browse");
    expect(activeHref("/c/rp-visa")).toBe("/browse");
  });

  it("matches whole path segments only", () => {
    expect(activeHref("/guides/blocked-account")).toBe("/guides");
    expect(activeHref("/guidesx")).toBeUndefined();
    expect(activeHref("/aboutus")).toBeUndefined();
    expect(activeHref("/")).toBeUndefined();
  });
});

describe("MobileNavDrawer", () => {
  it("opens, marks the current page and closes when a link is followed", async () => {
    render(<MobileNavDrawer pathname="/guides/blocked-account" />);
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(isOpen()).toBe(true);

    expect(screen.getByRole("link", { name: "Guides" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Browse" })).not.toHaveAttribute("aria-current");

    await userEvent.click(screen.getByRole("link", { name: "About" }));
    expect(isOpen()).toBe(false);
  });

  it("marks nothing before the path is known", async () => {
    render(<MobileNavDrawer pathname={null} />);
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(document.querySelector("[aria-current]")).toBeNull();
  });

  it("offers Ask a question and a home link", async () => {
    render(<MobileNavDrawer pathname="/" />);
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("link", { name: "Ask a question" })).toHaveAttribute("href", "/new");
    expect(screen.getByRole("link", { name: "PSA FAU Community Forum" })).toHaveAttribute("href", "/");
  });

  it("closes itself and asks the command palette to open from Search", async () => {
    const onOpen = vi.fn();
    window.addEventListener(OPEN_COMMAND_PALETTE, onOpen);
    render(<MobileNavDrawer pathname="/" />);
    await userEvent.click(screen.getByRole("button", { name: "Open menu" }));
    await userEvent.click(screen.getByRole("button", { name: "Search threads…" }));
    expect(isOpen()).toBe(false);
    expect(onOpen).toHaveBeenCalledOnce();
    window.removeEventListener(OPEN_COMMAND_PALETTE, onOpen);
  });
});
