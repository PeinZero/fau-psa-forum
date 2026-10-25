import { AbsoluteFill } from "remotion";

import { enter } from "../../lib/motion";
import { scene } from "../../lib/timeline";
import { landsAt, type MessageItem, NOISE_ITEMS } from "./conversation";
import { BUBBLE, FONT_FAMILY, LAND_LEAD, POP, wrapWords } from "./layout";
import { PALETTE } from "./queries";

/*
 * The same questions in every other group and every other semester: out-of-focus bubbles far
 * behind the phone, one more on each early beat, drifting up as the chat does. Background only,
 * so they stay soft and dim and keep clear of the story lines.
 */

type Ghost = {
  /** The question it repeats. */
  from: string;
  /** It appears as this message lands in the phone; without one it is there from the start. */
  with?: string;
  x: number;
  y: number;
  scale: number;
  blur: number;
  opacity: number;
  /** How far it drifts up over the scene. */
  lift: number;
};

const GHOSTS: Ghost[] = [
  { from: "m2", x: 330, y: 190, scale: 0.62, blur: 7, opacity: 0.4, lift: 70 },
  { from: "m13", x: 210, y: 790, scale: 0.7, blur: 5, opacity: 0.42, lift: 110 },
  { from: "m8", with: "m4", x: 1735, y: 300, scale: 0.6, blur: 7, opacity: 0.36, lift: 80 },
  { from: "m12", with: "m5", x: 690, y: 930, scale: 0.66, blur: 6, opacity: 0.38, lift: 120 },
  { from: "m11", with: "m6", x: 760, y: 120, scale: 0.55, blur: 9, opacity: 0.3, lift: 60 },
  { from: "m1", with: "m7", x: 1770, y: 800, scale: 0.64, blur: 6, opacity: 0.36, lift: 100 },
  { from: "m4", with: "m8", x: 120, y: 360, scale: 0.52, blur: 10, opacity: 0.26, lift: 50 },
  { from: "m10", with: "m9a", x: 1800, y: 560, scale: 0.5, blur: 10, opacity: 0.26, lift: 60 },
];

function message(id: string): MessageItem {
  const m = NOISE_ITEMS.find((it): it is MessageItem => it.id === id && it.kind === "message");
  if (!m) throw new Error(`No message ${id}`);
  return m;
}

const SCENE_FRAMES = scene("noise").durationInFrames;

const RESOLVED = GHOSTS.map((g) => {
  const m = message(g.from);
  return { ...g, message: m, lines: wrapWords(m.text, BUBBLE.text, BUBBLE.maxText), at: g.with ? landsAt(NOISE_ITEMS, g.with) : -SCENE_FRAMES };
});

function GhostBubble({ message: m, lines }: { message: MessageItem; lines: string[] }) {
  return (
    <div
      style={{
        padding: `${BUBBLE.padTop}px ${BUBBLE.padX}px ${BUBBLE.padBottom + 4}px`,
        borderRadius: `0 ${BUBBLE.radius}px ${BUBBLE.radius}px ${BUBBLE.radius}px`,
        background: PALETTE.bubble,
        fontFamily: FONT_FAMILY,
        color: PALETTE.text,
        whiteSpace: "nowrap",
      }}
    >
      <div style={{ fontSize: BUBBLE.nameSize, lineHeight: `${BUBBLE.name}px`, fontWeight: 500, color: m.sender.color }}>
        {m.sender.phone ? `~ ${m.sender.name}` : m.sender.name}
      </div>
      {lines.map((line, i) => (
        <div key={i} style={{ fontSize: BUBBLE.text, lineHeight: `${BUBBLE.line}px` }}>
          {line}
        </div>
      ))}
    </div>
  );
}

export function GhostBubbles({ frame, fade = 1 }: { frame: number; fade?: number }) {
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {RESOLVED.map((g) => {
        const t = enter(frame, g.at - LAND_LEAD, POP + 3);
        if (t <= 0) return null;
        const lift = (g.lift * frame) / SCENE_FRAMES;
        return (
          <div
            key={g.from}
            style={{
              position: "absolute",
              left: g.x,
              top: g.y - lift,
              transform: `translate(-50%, -50%) scale(${g.scale * (0.94 + 0.06 * t)})`,
              opacity: g.opacity * t * fade,
              filter: `blur(${g.blur}px)`,
            }}
          >
            <GhostBubble message={g.message} lines={g.lines} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
