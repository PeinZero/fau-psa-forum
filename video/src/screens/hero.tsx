import { Check, PenLine, Search } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill } from "remotion";

import { HERO_STAGE } from "../lib/handoffs";
import { clamp01 } from "../lib/motion";
import { buttonClasses } from "../ui/button";
import { Kbd } from "../ui/kbd";

export const trustPoints = ["Moderated by students", "Verified guides", "Free and independent"] as const;

/**
 * How far each part of the hero has built, 0–1. Home itself arrives complete with no entrance
 * motion; this build is the film's own, for the hero gathering out of scene 2's particles.
 */
export type HeroBuild = {
  pill?: number;
  /** The pill's emerald dot, which the particles of scene 2 gather into. */
  dot?: number;
  headline?: number;
  sub?: number;
  buttons?: number;
  trust?: number;
};

const FULL: Required<HeroBuild> = { pill: 1, dot: 1, headline: 1, sub: 1, buttons: 1, trust: 1 };

function fadeUp(t: number, distance = 8): CSSProperties {
  return { opacity: t, transform: t < 1 ? `translateY(${(1 - t) * distance}px)` : undefined };
}

/**
 * The home hero from src/components/landing/hero.tsx at the lg breakpoint: always the PSA pill
 * (announcements live in the bar above the header), without the spotlight (the stage draws it)
 * and without "Watch the intro", which would point at this film.
 */
export function Hero({ build = FULL, searchSlot }: { build?: HeroBuild; searchSlot?: ReactNode }) {
  const b = { ...FULL, ...build };
  return (
    <section className="flex flex-col items-center text-center">
      <p
        className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-background/70 py-1 pr-3 pl-2.5 text-meta font-medium text-muted shadow-[0_1px_2px_var(--shadow-color)]"
        style={fadeUp(b.pill, 4)}
      >
        <span aria-hidden className="relative flex size-2 shrink-0" style={{ opacity: b.dot }} data-anchor="hero-dot">
          <span className="absolute inset-0 rounded-full bg-accent opacity-30 blur-[3px]" />
          <span className="relative size-2 rounded-full bg-accent" />
        </span>
        <span className="truncate">
          Pakistan Student Association<span className="text-subtle"> · </span>FAU Erlangen-Nürnberg
        </span>
      </p>

      <h1
        className="mt-2 max-w-[15em] text-[3.5rem] leading-[1.05] font-semibold tracking-[-0.035em] text-balance text-foreground"
        style={fadeUp(b.headline)}
      >
        Answers for Pakistani students in Erlangen&nbsp;&amp;&nbsp;Nuremberg
      </h1>

      <p className="mt-6 max-w-[34rem] text-[1.0625rem] leading-7 text-pretty text-muted" style={fadeUp(b.sub)}>
        Residence permits, courses, housing and first steps, asked once and answered for everyone who comes next.
      </p>

      <div className="mt-9 flex flex-row items-center gap-3" style={fadeUp(b.buttons)}>
        <span className={buttonClasses({ className: "min-h-11 px-5 text-body" })}>
          <PenLine strokeWidth={1.75} />
          Ask a question
        </span>
        {searchSlot ?? (
          <span className={buttonClasses({ variant: "secondary", className: "min-h-11 px-5 pr-3 text-body" })}>
            <Search strokeWidth={1.75} className="text-muted" />
            Search threads
            <span className="ml-1.5 inline-flex min-w-[2.65rem]">
              <span className="inline-flex gap-0.5">
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </span>
            </span>
          </span>
        )}
      </div>

      <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-meta text-muted">
        {trustPoints.map((point, i) => (
          <li key={point} className="inline-flex items-center gap-1.5" style={fadeUp(clamp01((b.trust - i * 0.2) / 0.6))}>
            <Check aria-hidden strokeWidth={2} className="size-3.5 text-accent" />
            {point}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The hero placed on the stage with the shared framing, so scene 2 can hand over to
 * scene 3 on a match cut. `push` adds the scene's camera push on top (≤ 0.06).
 */
export function HeroStage({
  build,
  push = 0,
  searchSlot,
  style,
}: {
  build?: HeroBuild;
  push?: number;
  searchSlot?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <AbsoluteFill>
      <div
        data-theme="dark"
        className="site"
        style={{
          position: "absolute",
          left: "50%",
          top: HERO_STAGE.top,
          width: HERO_STAGE.width,
          background: "transparent",
          transform: `translateX(-50%) scale(${HERO_STAGE.scale * (1 + push)})`,
          transformOrigin: `50% ${HERO_STAGE.originY}px`,
          ...style,
        }}
      >
        <Hero build={build} searchSlot={searchSlot} />
      </div>
    </AbsoluteFill>
  );
}
