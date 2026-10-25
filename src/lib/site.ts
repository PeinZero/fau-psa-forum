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

/**
 * The landing page's intro video. Leave `null` until the video exists: nothing is rendered then.
 * To publish it, put the files under /public (poster, captions .vtt, mp4/webm) and set e.g.
 * `{ title: "Welcome to the forum", durationLabel: "1:30", poster: "/intro/poster.jpg",
 *    captions: "/intro/captions.vtt", source: { kind: "file", mp4: "/intro/intro.mp4" } }`,
 * or use `source: { kind: "youtube", id: "<video id>" }`.
 */
export const introVideo: IntroVideo | null = null;
