import type { CSSProperties } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

import { enter, exit, MIN_TEXT } from "../lib/motion";

type OnScreenLineProps = {
  text: string;
  /** Local frames the line is fully readable between (at least 2 s apart). */
  from: number;
  to: number;
  /** Vertical placement of the line's centre, in frame pixels. */
  y?: number;
  size?: number;
  maxWidth?: number;
  style?: CSSProperties;
};

/**
 * The film has no voice-over: one short line at a time tells the story,
 * in Reddit Sans semibold, fading up out of a soft blur.
 */
export function OnScreenLine({ text, from, to, y = 930, size = 60, maxWidth = 1500, style }: OnScreenLineProps) {
  const frame = useCurrentFrame();
  if (to - from < MIN_TEXT) {
    throw new Error(`"${text}" is on screen for ${to - from} frames; keep text up at least ${MIN_TEXT}.`);
  }
  const inT = enter(frame, from - 21, 21);
  const outT = exit(frame, to, 18);
  const opacity = Math.min(inT, outT);
  if (opacity <= 0) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: y,
          width: maxWidth,
          transform: `translate(-50%, -50%) translateY(${(1 - inT) * 14}px)`,
          opacity,
          filter: inT < 1 ? `blur(${(1 - inT) * 8}px)` : undefined,
          textAlign: "center",
          fontFamily: '"Reddit Sans", "Noto Color Emoji", sans-serif',
          fontWeight: 600,
          fontSize: size,
          lineHeight: 1.15,
          letterSpacing: "-0.025em",
          color: "#f7f8f8",
          textWrap: "balance",
          textShadow: "0 2px 30px rgba(8,9,10,0.85), 0 0 2px rgba(8,9,10,0.6)",
          ...style,
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
}
