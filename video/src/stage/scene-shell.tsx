import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

import { enter } from "../lib/motion";
import { scene, type SceneId, TRANSITION } from "../lib/timeline";

type SceneShellProps = {
  id: SceneId;
  /** "depth": fade up out of a soft blur; "none": the scene handles its own entrance. */
  enter?: "depth" | "none";
  /**
   * "handoff": a match cut — the next scene draws the identical shot over the overlap, so this
   * one steps aside (two copies of the same frame would double every translucent pixel).
   */
  leave?: "depth" | "none" | "handoff";
  children: ReactNode;
};

/**
 * Wraps a scene in its Sequence. The transition is one beat-centred 24-frame overlap
 * (0.8 s) with the site's entrance curve: the outgoing scene recedes into the blur
 * while the incoming one comes forward out of it.
 */
export function SceneShell({ id, enter: entrance = "depth", leave = "depth", children }: SceneShellProps) {
  const frame = useCurrentFrame();
  const s = scene(id);
  const isFirst = s.from === 0;
  const isLast = s.id === "endCard";
  const inT = entrance === "depth" && !isFirst ? enter(frame, 0, TRANSITION) : 1;
  const outStart = s.durationInFrames - TRANSITION;
  if (leave === "handoff" && frame >= outStart) return null;
  const outT = leave === "depth" && !isLast ? enter(frame, outStart, TRANSITION) : 0;
  const blur = (1 - inT) * 5 + outT * 5;
  const scale = (1 + (1 - inT) * 0.015) * (1 - outT * 0.012);
  return (
    <AbsoluteFill
      style={{
        opacity: inT * (1 - outT),
        filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
        transform: scale !== 1 ? `scale(${scale})` : undefined,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}
