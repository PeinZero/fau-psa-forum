export type IntroVideo = {
  title: string;
  /** Shown to visitors, e.g. "1:30". */
  durationLabel: string;
  /** Path under /public or an absolute URL of the still shown before playback. */
  poster: string;
  /** WebVTT captions (English); only used for file sources. */
  captions?: string;
  source: { kind: "file"; mp4: string; webm?: string } | { kind: "youtube"; id: string };
};

/** The intro film on Home (see video/README.md). `null` hides the section and the hero link. */
export const introVideo: IntroVideo | null = {
  title: "How the PSA FAU Community Forum works",
  durationLabel: "1:28",
  poster: "/video/poster.webp",
  captions: "/video/intro.en.vtt",
  source: { kind: "file", mp4: "/video/intro.mp4", webm: "/video/intro.webm" },
};
