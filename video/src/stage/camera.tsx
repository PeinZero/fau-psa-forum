import { createContext, type ReactNode, useContext } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

import { easeInOut, enter } from "../lib/motion";

/** A shot may push in by at most 6%. */
export const MAX_PUSH = 0.06;

type CameraState = { progress: number; driftX: number; driftY: number };

const CameraContext = createContext<CameraState>({ progress: 0, driftX: 0, driftY: 0 });

type CameraProps = {
  /** Push-in over the move, as a fraction of scale (≤ 0.06). */
  push?: number;
  /** Drift of the whole frame over the move, in frame pixels. */
  drift?: [number, number];
  /** Local frames the move runs between. */
  from?: number;
  to: number;
  /** Point the push zooms towards, in % of the frame. */
  origin?: [number, number];
  children: ReactNode;
};

/** A slow, confident camera: one push or drift per shot, eased at both ends. */
export function Camera({ push = 0.03, drift = [0, 0], from = 0, to, origin = [50, 50], children }: CameraProps) {
  const frame = useCurrentFrame();
  const progress = enter(frame, from, Math.max(1, to - from), easeInOut);
  const scale = 1 + Math.min(MAX_PUSH, push) * progress;
  const state = { progress, driftX: drift[0], driftY: drift[1] };
  return (
    <CameraContext.Provider value={state}>
      <AbsoluteFill
        style={{
          transform: `translate(${drift[0] * progress}px, ${drift[1] * progress}px) scale(${scale})`,
          transformOrigin: `${origin[0]}% ${origin[1]}%`,
        }}
      >
        {children}
      </AbsoluteFill>
    </CameraContext.Provider>
  );
}

/**
 * A layer at a different depth: it moves with the camera's drift times `depth`
 * (1 = with the frame, 0.5 = further away, 1.5 = closer).
 */
export function Parallax({ depth, children }: { depth: number; children: ReactNode }) {
  const { progress, driftX, driftY } = useContext(CameraContext);
  const extra = depth - 1;
  return (
    <AbsoluteFill style={{ transform: `translate(${driftX * progress * extra}px, ${driftY * progress * extra}px)` }}>
      {children}
    </AbsoluteFill>
  );
}
