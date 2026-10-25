import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/landing/sections", () => ({
  HeroEyebrow: () => <p>hero eyebrow</p>,
  StartHere: () => <p>start here</p>,
  Topics: () => <p>topics</p>,
  PopularQuestions: () => <p>popular</p>,
  CommunityStrip: () => <p>community</p>,
}));
vi.mock("@/components/notice/deleted-notice", () => ({ DeletedNotice: () => null }));
vi.mock("@/components/landing/intro-video", () => ({ IntroVideo: () => null, WatchIntroLink: () => null }));
vi.mock("@/components/thread/open-search-button", () => ({ OpenSearchButton: () => null }));
vi.mock("@/components/thread/search-shortcut", () => ({ SearchShortcut: () => null }));

import Home from "@/app/page";

describe("Home", () => {
  it("leads with the announcement and has no separate latest-announcement section", () => {
    const { container } = render(<Home />);
    expect(screen.getByText("hero eyebrow")).toBeInTheDocument();
    expect(screen.queryByText("Latest announcement")).toBeNull();
    expect(container.querySelector("#announcement")).toBeNull();
  });
});
