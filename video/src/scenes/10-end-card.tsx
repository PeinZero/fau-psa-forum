import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

import { CLAMP, easeInOut, enter } from "../lib/motion";
import { localBeat, scene } from "../lib/timeline";
import { lines } from "../lines/endCard";
import { Logo, LogoBloom, LogoGlow } from "../screens/logo";
import { Camera } from "../stage/camera";
import { SceneShell } from "../stage/scene-shell";

const S = scene("endCard");
const beatAt = (n: number) => localBeat("endCard", S.startBeat + n);

/** Entrances run 400 ms and land on their beat. */
const LAND = 12;
const [tagline] = lines;

/**
 * The logo lands on the score's final hit (the cut), the lines follow one beat apart, the note on
 * the next downbeat; the card holds and goes to black with the tail, black on the film's last frame.
 */
export const END_CARD_TIMING = {
  logo: beatAt(0),
  name: beatAt(1),
  tagline: tagline.from,
  url: beatAt(3),
  note: beatAt(4),
  /** The last 0.77 s, with the score's tail. */
  fadeStart: S.durationInFrames - 24,
  fadeEnd: S.durationInFrames - 1,
};

const LOGO_SIZE = 136;
const LOGO_TOP = 262;
const NOTE_TOP = 940;
/** The bloom sits behind the middle of the card (logo to address), not just the logo. */
const BLOOM_CENTER = 470;
/** On the hit the logo stands at the frame's centre: this far below its place in the card. */
const HIT_LIFT = 540 - (LOGO_TOP + LOGO_SIZE / 2);

/** The site's fade-up, eased with no overshoot, with a little focus pull; it lands on `at`. */
function settle(frame: number, at: number, distance = 18): CSSProperties {
  const t = enter(frame, at - LAND, LAND);
  const blur = (1 - t) * 4;
  return {
    opacity: t,
    transform: t < 1 ? `translateY(${(1 - t) * distance}px)` : undefined,
    filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
  };
}

function Settle({ frame, at, className, children }: { frame: number; at: number; className?: string; children: ReactNode }) {
  return (
    <div className={className} style={settle(frame, at)}>
      {children}
    </div>
  );
}

export function EndCardScene() {
  const frame = useCurrentFrame();
  const T = END_CARD_TIMING;
  // The bloom swells into the hit, peaks on it, and settles to a steady glow over the next bar and a half.
  const bloom = interpolate(frame, [0, T.logo - 2, T.logo, T.logo + 4, T.logo + 54], [0, 0.35, 1, 1, 0.62], {
    ...CLAMP,
    easing: easeInOut,
  });
  const logoIn = interpolate(frame, [T.logo - 2, T.logo], [0, 1], CLAMP);
  // The logo appears on the hit a touch large and settles into place: no overshoot.
  const logoScale = 1 + 0.06 * (1 - enter(frame, T.logo, 30));
  // It hits alone in the middle of the frame, then the card lifts it to the top as the name lands.
  const lift = HIT_LIFT * (1 - enter(frame, T.name - LAND, LAND));
  const toBlack = enter(frame, T.fadeStart, T.fadeEnd - T.fadeStart, easeInOut);

  return (
    <SceneShell id="endCard" enter="none" leave="none">
      <Camera push={0.04} from={0} to={S.durationInFrames} origin={[50, 46]}>
        <AbsoluteFill data-theme="dark" className="font-sans" style={{ background: "transparent" }}>
          <LogoBloom centerY={BLOOM_CENTER + lift / 3} opacity={bloom} />
          <div
            className="absolute inset-x-0 flex flex-col items-center text-center"
            style={{ top: LOGO_TOP, transform: lift > 0.05 ? `translateY(${lift}px)` : undefined }}
          >
            <div className="relative" style={{ opacity: logoIn, transform: `scale(${logoScale})` }}>
              <LogoGlow size={LOGO_SIZE} opacity={bloom} />
              <Logo size={LOGO_SIZE} style={{ position: "relative" }} />
            </div>

            <Settle frame={frame} at={T.name} className="mt-12">
              <h1 className="text-[84px] leading-[1.1] font-semibold tracking-[-0.035em] text-foreground">
                PSA FAU Community Forum
              </h1>
            </Settle>

            <Settle frame={frame} at={T.tagline} className="mt-5">
              <p className="text-[44px] leading-[1.3] font-normal tracking-[-0.015em] text-muted">{tagline.text}</p>
            </Settle>

            <Settle frame={frame} at={T.url} className="mt-14">
              <p
                className="text-[36px] leading-[1.4] font-medium tracking-[-0.01em] text-foreground underline decoration-accent/50 underline-offset-[12px]"
                style={{ textDecorationThickness: 2 }}
              >
                fau-psa-forum.vercel.app
              </p>
            </Settle>
          </div>

          <Settle frame={frame} at={T.note} className="absolute inset-x-0 text-center">
            <p className="text-[28px] leading-[1.4] text-subtle" style={{ marginTop: NOTE_TOP }}>
              An independent student project, not affiliated with FAU.
            </p>
          </Settle>
        </AbsoluteFill>
      </Camera>
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: toBlack }} />
    </SceneShell>
  );
}
