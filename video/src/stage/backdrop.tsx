import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

import { CLAMP, clamp01, easeInOut } from "../lib/motion";
import { scene } from "../lib/timeline";

/**
 * The stage the film keeps coming back to: the hero spotlight (emerald glow over a faint grid)
 * on #08090a. It glows at half strength behind the group chat and opens fully on the drop.
 */
export function spotlightAt(frame: number): number {
  const onePlace = scene("onePlace");
  const chat = scene("backToChat");
  const end = scene("endCard");
  return interpolate(
    frame,
    [onePlace.cut - 30, onePlace.cut, chat.from, chat.from + 24, end.from, end.from + 12],
    [0.45, 1, 1, 0.7, 0.7, 1],
    { ...CLAMP, easing: easeInOut },
  );
}

type BackdropProps = {
  /** Absolute film frame of this composition's frame 0 (for per-scene previews). */
  offset?: number;
  /** Override the timeline's spotlight intensity (0–1). */
  intensity?: number;
};

export function Backdrop({ offset = 0, intensity }: BackdropProps) {
  const frame = useCurrentFrame() + offset;
  const spot = intensity ?? spotlightAt(frame);
  // A slow breath in the glow keeps the empty stage alive without drawing the eye.
  const breath = 1 + 0.04 * Math.sin((frame / 30) * ((2 * Math.PI) / 12));
  return (
    <AbsoluteFill style={{ backgroundColor: "#08090a" }}>
      <SpotlightLayer intensity={spot * breath} />
      <Vignette />
    </AbsoluteFill>
  );
}

export function Vignette({ strength = 0.55 }: { strength?: number }) {
  return (
    <AbsoluteFill
      style={{ background: `radial-gradient(120% 90% at 50% 45%, transparent 55%, rgba(0,0,0,${strength}) 100%)` }}
    />
  );
}

/** The hero-spotlight utility from globals.css, scaled up for the 1920×1080 frame. */
export function SpotlightLayer({ intensity = 1, top = -60 }: { intensity?: number; top?: number }) {
  return (
    <AbsoluteFill style={{ opacity: clamp01(intensity) }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top,
          height: 1200,
          background: "radial-gradient(48% 54% at 50% 40%, rgb(16 185 129 / 0.22), transparent 74%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top,
          height: 1080,
          backgroundImage:
            "linear-gradient(to right, rgb(255 255 255 / 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.05) 1px, transparent 1px)",
          backgroundSize: "84px 84px",
          backgroundPosition: "center top",
          maskImage: "radial-gradient(ellipse 55% 60% at 50% 38%, #000 15%, transparent 72%)",
          WebkitMaskImage: "radial-gradient(ellipse 55% 60% at 50% 38%, #000 15%, transparent 72%)",
        }}
      />
    </AbsoluteFill>
  );
}
