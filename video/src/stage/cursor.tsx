import { interpolate, useCurrentFrame } from "remotion";

import { CLAMP, easeInOut, easeOut, enter, mix } from "../lib/motion";

export type CursorPoint = {
  /** Local frame the cursor arrives here. */
  frame: number;
  x: number;
  y: number;
  /** Click on arrival. */
  click?: boolean;
};

type CursorProps = {
  /** Waypoints in the parent's coordinate space, ordered by frame. */
  points: CursorPoint[];
  /** Frames of travel before each waypoint (the cursor rests otherwise). */
  travel?: number;
  /** Arrow height in the parent's pixels. */
  size?: number;
  /** Fade in before the first point and out after `hideAt`. */
  showAt?: number;
  hideAt?: number;
};

const RIPPLE = 21;

/** The pointer glides with easing between waypoints and leaves a soft emerald ripple on each click. */
export function Cursor({ points, travel = 24, size = 22, showAt, hideAt }: CursorProps) {
  const frame = useCurrentFrame();
  if (points.length === 0) return null;
  const { x, y } = positionAt(points, frame, travel);
  const first = showAt ?? points[0].frame - travel;
  const visible =
    interpolate(frame, [first - 9, first], [0, 1], CLAMP) *
    (hideAt === undefined ? 1 : interpolate(frame, [hideAt, hideAt + 12], [1, 0], CLAMP));
  const press = points
    .filter((p) => p.click)
    .reduce((acc, p) => {
      const d = frame - p.frame;
      if (d < -3 || d > 6) return acc;
      return Math.min(acc, interpolate(d, [-3, 0, 6], [1, 0.86, 1]));
    }, 1);
  return (
    <>
      {points
        .filter((p) => p.click && frame >= p.frame && frame < p.frame + RIPPLE)
        .map((p) => (
          <Ripple key={p.frame} x={p.x} y={p.y} age={frame - p.frame} size={size} />
        ))}
      <svg
        width={size * 0.75}
        height={size}
        viewBox="0 0 18 24"
        style={{
          position: "absolute",
          left: x,
          top: y,
          opacity: visible,
          transform: `translate(-2px, -1px) scale(${press})`,
          transformOrigin: "2px 1px",
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.45))",
          overflow: "visible",
          zIndex: 50,
        }}
      >
        <path
          d="M2 1.5 L2 19.5 L6.6 15.3 L9.6 22 L12.6 20.7 L9.7 14.1 L16 14.1 Z"
          fill="#f7f8f8"
          stroke="#08090a"
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
      </svg>
    </>
  );
}

function Ripple({ x, y, age, size }: { x: number; y: number; age: number; size: number }) {
  const t = easeOut(Math.min(1, age / RIPPLE));
  const radius = size * (0.3 + 1.5 * t);
  return (
    <span
      style={{
        position: "absolute",
        left: x - radius,
        top: y - radius,
        width: radius * 2,
        height: radius * 2,
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(16,185,129,${0.28 * (1 - t)}) 0%, rgba(16,185,129,${0.12 * (1 - t)}) 55%, transparent 72%)`,
        boxShadow: `0 0 0 1.5px rgba(52,211,153,${0.55 * (1 - t)})`,
        zIndex: 49,
      }}
    />
  );
}

function positionAt(points: CursorPoint[], frame: number, travel: number) {
  if (frame <= points[0].frame) return points[0];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const next = points[i];
    if (frame <= next.frame) {
      const start = Math.max(prev.frame, next.frame - travel);
      const t = enter(frame, start, next.frame - start, easeInOut);
      return { x: mix(prev.x, next.x, t), y: mix(prev.y, next.y, t) };
    }
  }
  return points[points.length - 1];
}

/** Frames on which the cursor clicks, for placing click sounds. */
export function clickFrames(points: CursorPoint[]): number[] {
  return points.filter((p) => p.click).map((p) => p.frame);
}
