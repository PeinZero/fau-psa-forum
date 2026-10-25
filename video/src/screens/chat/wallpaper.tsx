import { useId } from "react";

const TILE = 240;

// Each doodle is drawn in a 32px box centred on the origin; centres stay at
// least 20px inside the tile so neighbouring tiles join without clipping.
const DOODLES: { d: string; x: number; y: number; r: number; s?: number }[] = [
  // open book
  { d: "M-14 -8 Q-7 -11 0 -7 Q7 -11 14 -8 V9 Q7 6 0 10 Q-7 6 -14 9 Z M0 -7 V10", x: 24, y: 22, r: -12, s: 1.32 },
  // coffee cup with steam
  { d: "M-9 -2 H7 V6 Q7 12 1 12 H-3 Q-9 12 -9 6 Z M7 0 H10 Q13 0 13 4 Q13 7 8 7 M-5 -5 Q-7 -8 -5 -11 M0 -5 Q-2 -8 0 -11", x: 74, y: 37, r: 8, s: 1.2 },
  // paper plane
  { d: "M-14 -2 L14 -12 L6 12 L0 2 Z M-14 -2 L0 2 L14 -12", x: 121, y: 21, r: -20, s: 1.26 },
  // chat bubble with three dots
  { d: "M-13 -10 H13 V6 H-2 L-8 12 V6 H-13 Z M-6 -2 H-5.9 M0 -2 H0.1 M6 -2 H6.1", x: 169, y: 36, r: 6, s: 1.2 },
  // five-point star
  { d: "M0 -14 L3.5 -4.9 L13.3 -4.3 L5.7 1.9 L8.2 11.3 L0 6 L-8.2 11.3 L-5.7 1.9 L-13.3 -4.3 L-3.5 -4.9 Z", x: 216, y: 23, r: 15, s: 1.2 },
  // music note
  { d: "M-4 10 V-9 L8 -12 V7 M-4 10 A4 3 0 1 1 -12 10 A4 3 0 1 1 -4 10 Z M8 7 A4 3 0 1 1 0 7 A4 3 0 1 1 8 7 Z", x: 30, y: 86, r: -10, s: 1.32 },
  // pencil
  { d: "M-12 12 L-10 5 L7 -12 L12 -7 L-5 10 Z M-10 5 L-5 10 M4 -9 L9 -4", x: 92, y: 92, r: 25, s: 1.26 },
  // cloud
  { d: "M-10 9 A6 6 0 0 1 -9 -3 A8 8 0 0 1 6 -5 A6 6 0 0 1 10 9 Z", x: 150, y: 88, r: -5, s: 1.44 },
  // heart
  { d: "M0 12 L-11 0 A6 6 0 0 1 0 -6 A6 6 0 0 1 11 0 Z", x: 210, y: 94, r: 14, s: 1.32 },
  // crescent moon
  { d: "M6 -12 A13 13 0 1 0 12 7 A10 10 0 0 1 6 -12 Z", x: 24, y: 145, r: 18, s: 1.2 },
  // lightbulb
  { d: "M-6 5 Q-12 -1 -9 -7 A9 9 0 0 1 9 -7 Q12 -1 6 5 V8 H-6 Z M-4 12 H4", x: 74, y: 151, r: -14, s: 1.2 },
  // clock
  { d: "M13 0 A13 13 0 1 1 -13 0 A13 13 0 1 1 13 0 Z M0 -7 V0 L5 4", x: 121, y: 148, r: 10, s: 1.26 },
  // graduation cap
  { d: "M0 -9 L15 -3 L0 3 L-15 -3 Z M-8 0 V7 Q0 12 8 7 V0 M15 -3 V6", x: 168, y: 153, r: -8, s: 1.2 },
  // bicycle
  { d: "M-4 6 A5 5 0 1 1 -14 6 A5 5 0 1 1 -4 6 M14 6 A5 5 0 1 1 4 6 A5 5 0 1 1 14 6 M-9 6 L-2 -4 H6 L9 6 M-2 -4 L2 6 M-4 -7 H0 M5 -4 L4 -8 H8", x: 216, y: 148, r: -18, s: 1.26 },
  // leaf
  { d: "M-11 11 Q-12 -8 11 -11 Q12 9 -11 11 Z M-11 11 L3 -3", x: 32, y: 205, r: 12, s: 1.32 },
  // sparkles
  { d: "M0 -10 Q1 -1 10 0 Q1 1 0 10 Q-1 1 -10 0 Q-1 -1 0 -10 Z M11 -11 V-7 M9 -9 H13", x: 92, y: 217, r: 0, s: 1.32 },
  // envelope
  { d: "M-13 -8 H13 V8 H-13 Z M-13 -8 L0 2 L13 -8", x: 150, y: 203, r: -15, s: 1.26 },
  // camera
  { d: "M-13 -5 H-7 L-5 -9 H5 L7 -5 H13 V9 H-13 Z M5 2 A5 5 0 1 1 -5 2 A5 5 0 1 1 5 2 Z", x: 208, y: 217, r: 9, s: 1.2 },
];

export function DoodleWallpaper({
  width,
  height,
  opacity = 0.06,
}: {
  width: number;
  height: number;
  opacity?: number;
}) {
  const id = `doodles-${useId().replace(/:/g, "")}`;

  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <pattern id={id} width={TILE} height={TILE} patternUnits="userSpaceOnUse">
          {/* Stroke only: the parent paints the chat colour, so fills would read as blobs */}
          <g fill="none" stroke="#fff" strokeOpacity={opacity} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            {DOODLES.map(({ d, x, y, r, s = 1 }) => (
              <path
                key={`${x}-${y}`}
                d={d}
                transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        </pattern>
      </defs>
      <rect width={width} height={height} fill={`url(#${id})`} />
    </svg>
  );
}
