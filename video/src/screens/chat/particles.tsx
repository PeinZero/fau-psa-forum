import { AbsoluteFill, interpolate, random } from "remotion";

import { HERO_DOT, HERO_STAGE } from "../../lib/handoffs";
import { CLAMP, easeInOut, easeOut, enter, exit, mix } from "../../lib/motion";
import { scene, WIDTH } from "../../lib/timeline";
import type { Vec } from "../../stage/projection";
import { BURIED_WIDTH, BURIED_X, PHONE_LEAVE, RISER, underHeader } from "./noise";
import { mixRgb } from "./queries";

/*
 * The drop: the buried answer breaks out from under the header as emerald particles, which rise
 * and rush into the hero pill's dot; the dot ignites on the downbeat. Frames here are film frames.
 */

const ONE_PLACE = scene("onePlace");
const DROP = ONE_PLACE.cut;
/** Scene 2 draws the particles from its first frame; scene 1 hands them over there. */
export const HANDOVER = ONE_PLACE.from;

/** Scene 2's camera starts a little wide on the drop and settles on the shared hero framing. */
const HERO_PUSH = { from: -0.04, start: ONE_PLACE.local, end: 228 };

export function heroPushAt(local: number): number {
  return HERO_PUSH.from * (1 - enter(local, HERO_PUSH.start, HERO_PUSH.end - HERO_PUSH.start, easeInOut));
}

/** Frame position of the pill's dot under the hero's camera push. */
export function heroDotAt(push: number): Vec {
  const cx = WIDTH / 2;
  const cy = HERO_STAGE.top + HERO_STAGE.originY;
  return { x: cx + (HERO_DOT.x - cx) * (1 + push), y: cy + (HERO_DOT.y - cy) * (1 + push) };
}

const TARGET = heroDotAt(heroPushAt(0));

type Particle = {
  birth: number;
  x0: number;
  y0: number;
  riseX: number;
  riseY: number;
  gather: number;
  arrive: number;
  bend: number;
  size: number;
  alpha: number;
  phase: number;
};

const COUNT = 170;
// Sparks start leaking out during the riser; most leave as the phone goes.
const BIRTH = { from: RISER.from + 12, to: PHONE_LEAVE.from + 14 };
const GATHER_FROM = PHONE_LEAVE.from + 6;
const ARRIVE = { from: DROP - 9, to: DROP };

function buildParticles(): Particle[] {
  return Array.from({ length: COUNT }, (_, i) => {
    const r = (k: string) => random(`drop-${i}-${k}`);
    // Born along the header's edge over the answer's width, most of them near its middle.
    const spread = (r("u1") + r("u2") + r("u3")) / 3 - 0.5;
    const birth = Math.round(mix(BIRTH.from, BIRTH.to, Math.sqrt(r("birth"))));
    const p = underHeader(birth, BURIED_X + spread * BURIED_WIDTH);
    // Every particle is in flight early enough to land by the downbeat.
    const gather = Math.min(ARRIVE.to - 8, Math.max(birth + 9, GATHER_FROM + r("gather") * 8));
    // The last ones land exactly on the downbeat, so the dot fills as the drop hits.
    const arrive = Math.round(mix(ARRIVE.from, ARRIVE.to, Math.sqrt(r("arrive"))));
    return {
      birth,
      x0: p.x + (r("jx") - 0.5) * 10,
      y0: p.y + r("jy") * 8,
      riseX: spread * 90 + (r("rx") - 0.5) * 36,
      riseY: -(34 + r("ry") * 70),
      gather,
      arrive: Math.max(arrive, gather + 8),
      bend: (r("sign") < 0.85 ? 1 : -1) * (0.18 + r("bend") * 0.28),
      size: 8 + r("size") * 11,
      alpha: 0.6 + r("alpha") * 0.4,
      phase: r("phase") * Math.PI * 2,
    };
  });
}

const PARTICLES = buildParticles();

const MINT: [number, number, number] = [220, 252, 236];
const EMERALD: [number, number, number] = [52, 211, 153];

/** The light under the header breaking out with the particles, carried past the fading phone. */
function ReleaseBloom({ frame }: { frame: number }) {
  const o = enter(frame, RISER.from + 20, 14) * exit(frame, PHONE_LEAVE.from + 8, 16);
  if (o <= 0) return null;
  const at = underHeader(Math.min(frame, PHONE_LEAVE.from + 10), BURIED_X);
  return (
    <div
      style={{
        position: "absolute",
        left: at.x - 300,
        top: at.y - 150,
        width: 600,
        height: 260,
        opacity: o,
        background: "radial-gradient(closest-side, rgba(110,231,183,0.55), rgba(16,185,129,0.2) 50%, rgba(16,185,129,0) 100%)",
        mixBlendMode: "screen",
      }}
    />
  );
}

/** The swarm at film frame `frame`. */
export function ParticleField({ frame }: { frame: number }) {
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <ReleaseBloom frame={frame} />
      {PARTICLES.map((p, i) => {
        if (frame < p.birth || frame >= p.arrive) return null;
        const age = frame - p.birth;
        const rise = interpolate(frame, [p.birth, p.gather + 6], [0, 1], { ...CLAMP, easing: easeOut });
        const p1x = p.x0 + p.riseX * rise;
        const p1y = p.y0 + p.riseY * rise;
        // Accelerating into the dot: the swarm rushes in rather than drifting.
        const s = interpolate(frame, [p.gather, p.arrive], [0, 1], { ...CLAMP, easing: (t) => t * t * (1.6 - 0.6 * t) });
        let x = p1x;
        let y = p1y;
        if (s > 0) {
          const dx = TARGET.x - p1x;
          const dy = TARGET.y - p1y;
          const c1x = p1x + dx * 0.2 - dy * p.bend;
          const c1y = p1y + dy * 0.2 + dx * p.bend - 20;
          const c2x = p1x + dx * 0.75 - dy * p.bend * 0.4;
          const c2y = p1y + dy * 0.75 + dx * p.bend * 0.4;
          const a = (1 - s) ** 3;
          const b = 3 * (1 - s) ** 2 * s;
          const c = 3 * (1 - s) * s * s;
          const d = s ** 3;
          x = a * p1x + b * c1x + c * c2x + d * TARGET.x;
          y = a * p1y + b * c1y + c * c2y + d * TARGET.y;
        }
        const fadeIn = interpolate(age, [0, 3], [0, 1], CLAMP);
        const flare = exit(age, 0, 12);
        const landing = interpolate(s, [0.75, 1], [1, 0.3], CLAMP);
        const size = p.size * (1 + flare * 0.7) * interpolate(s, [0.5, 1], [1, 0.5], CLAMP);
        const twinkle = 0.88 + 0.12 * Math.sin(frame * 0.3 + p.phase);
        const alpha = Math.min(1, (p.alpha + flare * 0.4) * fadeIn * landing * twinkle);
        const core = mixRgb(MINT, EMERALD, interpolate(age, [0, 14], [0, 1], CLAMP));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              opacity: alpha,
              background: `radial-gradient(circle, rgba(${core},1) 0%, rgba(${core},0.9) 20%, rgba(16,185,129,0.4) 46%, rgba(16,185,129,0) 70%)`,
              mixBlendMode: "screen",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

/** How much of the swarm has landed by film frame `frame` (0–1). */
function landed(frame: number): number {
  let sum = 0;
  for (const p of PARTICLES) sum += interpolate(frame, [p.arrive - 6, p.arrive], [0, 1], CLAMP);
  return sum / PARTICLES.length;
}

/**
 * The pill's dot while the particles fill it, igniting on the drop: the same emerald point and
 * soft halo as the hero's dot, a bloom and one soft ring. It hands over to the hero's own dot
 * once the pill has landed around it.
 */
export function GatherDot({ frame, at, handover }: { frame: number; at: Vec; handover: number }) {
  const fill = Math.max(landed(frame), enter(frame, DROP - 3, 3));
  const bloom = enter(frame, DROP - 4, 5) * exit(frame, DROP + 1, 30);
  const ring = enter(frame, DROP, 22);
  const d = HERO_DOT.size;
  const dotOpacity = fill * (1 - handover);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: at.x - 160,
          top: at.y - 160,
          width: 320,
          height: 320,
          borderRadius: "50%",
          opacity: bloom * 0.95,
          background: "radial-gradient(circle, rgba(167,243,208,0.85) 0%, rgba(52,211,153,0.45) 14%, rgba(16,185,129,0.14) 38%, rgba(16,185,129,0) 70%)",
          mixBlendMode: "screen",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: at.x - 18 - 100 * ring,
          top: at.y - 18 - 100 * ring,
          width: 36 + 200 * ring,
          height: 36 + 200 * ring,
          borderRadius: "50%",
          border: "2px solid rgba(52,211,153,0.6)",
          opacity: ring > 0 ? 0.8 * (1 - ring) : 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: at.x - d / 2,
          top: at.y - d / 2,
          width: d,
          height: d,
          borderRadius: "50%",
          background: "#10b981",
          opacity: 0.3 * dotOpacity,
          filter: "blur(4.35px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: at.x - d / 2,
          top: at.y - d / 2,
          width: d,
          height: d,
          borderRadius: "50%",
          background: "#10b981",
          opacity: dotOpacity,
        }}
      />
    </AbsoluteFill>
  );
}
