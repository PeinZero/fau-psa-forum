import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { IntroVideo as IntroVideoConfig } from "@/lib/site";

import { Hero } from "./hero";
import { IntroVideo, WatchIntroLink } from "./intro-video";

const file: IntroVideoConfig = {
  title: "Welcome to the forum",
  durationLabel: "1:30",
  poster: "/intro/poster.jpg",
  captions: "/intro/captions.vtt",
  source: { kind: "file", mp4: "/intro/intro.mp4", webm: "/intro/intro.webm" },
};
const youtube: IntroVideoConfig = { ...file, source: { kind: "youtube", id: "abc123" } };

describe("IntroVideo", () => {
  it("renders nothing when no video is configured", () => {
    const { container } = render(<IntroVideo video={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows poster, title, duration and the AI note before playing", () => {
    const { container } = render(<IntroVideo video={file} />);
    expect(container.querySelector("img")).toHaveAttribute("src", "/intro/poster.jpg");
    expect(screen.getByText("Welcome to the forum")).toBeInTheDocument();
    expect(screen.getByText("1:30")).toBeInTheDocument();
    expect(screen.getByText("AI-generated video")).toBeInTheDocument();
    expect(container.querySelector("video, iframe")).toBeNull();
  });

  it("swaps in a native video with a default captions track for file sources", () => {
    const { container } = render(<IntroVideo video={file} />);
    fireEvent.click(screen.getByRole("button", { name: "Play intro video: Welcome to the forum" }));
    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute("preload", "none");
    expect(video).toHaveAttribute("controls");
    const track = video?.querySelector("track");
    expect(track).toHaveAttribute("kind", "captions");
    expect(track).toHaveAttribute("srclang", "en");
    expect(track).toHaveAttribute("src", "/intro/captions.vtt");
    expect(track).toHaveAttribute("default");
    expect(video?.querySelector("source[type='video/mp4']")).toHaveAttribute("src", "/intro/intro.mp4");
    expect(video?.querySelector("source[type='video/webm']")).toHaveAttribute("src", "/intro/intro.webm");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("omits the track without captions", () => {
    const { container } = render(<IntroVideo video={{ ...file, captions: undefined }} />);
    fireEvent.click(screen.getByRole("button"));
    expect(container.querySelector("track")).toBeNull();
  });

  it("loads a youtube-nocookie iframe only after the click", () => {
    const { container } = render(<IntroVideo video={youtube} />);
    expect(container.querySelector("iframe")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Play intro video/ }));
    const src = container.querySelector("iframe")?.getAttribute("src") ?? "";
    expect(src.startsWith("https://www.youtube-nocookie.com/embed/abc123")).toBe(true);
    expect(src).toContain("autoplay=1");
  });
});

describe("Hero intro link", () => {
  it("is hidden without a video", () => {
    render(<Hero video={null} />);
    expect(screen.queryByRole("link", { name: /Watch the intro/ })).toBeNull();
  });

  it("links to the video section with its duration", () => {
    render(<Hero video={file} />);
    expect(screen.getByRole("link", { name: "Watch the intro (1:30)" })).toHaveAttribute("href", "#intro-video");
  });

  it("scrolls smoothly, or instantly under reduced motion", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(
      <>
        <WatchIntroLink durationLabel="1:30" />
        <IntroVideo video={file} />
      </>,
    );
    const link = screen.getByRole("link");
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
    fireEvent.click(link);
    expect(scrollIntoView).toHaveBeenLastCalledWith({ behavior: "smooth", block: "start" });
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    fireEvent.click(link);
    expect(scrollIntoView).toHaveBeenLastCalledWith({ behavior: "auto", block: "start" });
  });
});
