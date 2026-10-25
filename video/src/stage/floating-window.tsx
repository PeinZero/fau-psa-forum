import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill } from "remotion";

import { PERSPECTIVE, PERSPECTIVE_ORIGIN_CSS } from "./projection";

export type Theme = "dark" | "light";

export type FloatingWindowProps = {
  /** Offset of the window centre from the frame centre, in frame pixels. */
  x?: number;
  y?: number;
  /** Depth in frame pixels; negative is further away. */
  z?: number;
  /** Window size in CSS pixels of the site (chrome included). */
  width: number;
  height: number;
  /** Device scale: how many frame pixels one site pixel takes. */
  scale?: number;
  /** Tilt in degrees; the look caps it at 10°. */
  rotateX?: number;
  rotateY?: number;
  /** Depth-of-field blur in frame pixels. */
  blur?: number;
  opacity?: number;
  /** Strength of the emerald rim light, 0–1. */
  rim?: number;
  chrome?: "browser" | "none";
  url?: string;
  theme?: Theme;
  radius?: number;
  /** Extra style on the site surface (e.g. a clip-path reveal). */
  contentStyle?: CSSProperties;
  children: ReactNode;
};

const MAX_TILT = 10;
const tilt = (deg: number) => Math.max(-MAX_TILT, Math.min(MAX_TILT, deg));

export const CHROME_HEIGHT = 40;

/**
 * A site window floating in 3D space: soft long shadow, a faint emerald rim light, and
 * depth-of-field blur for everything that is not the element that matters.
 */
export function FloatingWindow({
  x = 0,
  y = 0,
  z = 0,
  width,
  height,
  scale = 1,
  rotateX = 0,
  rotateY = 0,
  blur = 0,
  opacity = 1,
  rim = 1,
  chrome = "browser",
  url = "fau-psa-forum.vercel.app",
  theme = "dark",
  radius = 14,
  contentStyle,
  children,
}: FloatingWindowProps) {
  const transform = [
    "translate(-50%, -50%)",
    `translate3d(${x}px, ${y}px, ${z}px)`,
    `rotateX(${tilt(rotateX)}deg)`,
    `rotateY(${tilt(rotateY)}deg)`,
    `scale(${scale})`,
  ].join(" ");
  const shadowAlpha = theme === "dark" ? 1 : 0.7;
  return (
    <AbsoluteFill style={{ perspective: PERSPECTIVE, perspectiveOrigin: PERSPECTIVE_ORIGIN_CSS, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width,
          height,
          transform,
          transformStyle: "preserve-3d",
          opacity,
          filter: blur > 0.05 ? `blur(${blur / scale}px)` : undefined,
        }}
      >
        <div
          data-theme={theme}
          className="site"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: radius,
            overflow: "hidden",
            boxShadow: [
              `0 60px 120px -24px rgba(0,0,0,${0.7 * shadowAlpha})`,
              `0 28px 56px -28px rgba(0,0,0,${0.8 * shadowAlpha})`,
              `0 0 140px -40px rgba(16,185,129,${0.28 * rim})`,
            ].join(", "),
            display: "flex",
            flexDirection: "column",
            ...contentStyle,
          }}
        >
          {chrome === "browser" ? <BrowserBar url={url} /> : null}
          <div style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden" }}>{children}</div>
        </div>
        {rim > 0 ? <RimLight radius={radius} strength={rim} theme={theme} /> : null}
      </div>
    </AbsoluteFill>
  );
}

/** A hairline that catches emerald light along the top edge and fades down the sides. */
export function RimLight({ radius, strength = 1, theme = "dark" }: { radius: number; strength?: number; theme?: Theme }) {
  const base = theme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: radius,
        padding: 1,
        background: `linear-gradient(180deg, rgba(52,211,153,${0.45 * strength}) 0%, rgba(16,185,129,${0.12 * strength}) 18%, ${base} 45%, ${base} 100%)`,
        WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
        pointerEvents: "none",
      }}
    />
  );
}

/** A generic browser bar: neutral dots and the address, no browser or OS marks. */
export function BrowserBar({ url }: { url: string }) {
  return (
    <div
      className="flex shrink-0 items-center border-b border-border bg-surface px-4"
      style={{ height: CHROME_HEIGHT }}
    >
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-3 rounded-full bg-border-strong/30" />
        ))}
      </div>
      <div className="mx-auto flex h-6 min-w-[22rem] items-center justify-center rounded-md bg-background px-3 text-meta text-subtle">
        {url}
      </div>
      <div className="w-[52px]" />
    </div>
  );
}
