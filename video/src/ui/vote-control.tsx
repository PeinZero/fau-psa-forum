import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "./cn";

export type VoteValue = 1 | 0 | -1;

const tones = {
  up: { arrow: "text-accent", score: "text-accent", pill: "bg-accent-soft" },
  down: { arrow: "text-danger", score: "text-danger", pill: "bg-danger/10" },
  none: { arrow: "", score: "text-foreground", pill: "bg-surface" },
};

const toneOf = (vote: VoteValue) => (vote === 1 ? tones.up : vote === -1 ? tones.down : tones.none);

export type VoteControlProps = {
  /** The number shown between the arrows (rendered with tabular digits). */
  score: number;
  /** Replaces the digits, e.g. with rolling digits while the score changes. */
  scoreNode?: ReactNode;
  /** 1 = upvoted: arrow filled emerald, score emerald and, as a pill, the whole pill tinted. */
  myVote?: VoteValue;
  /** "pill" for the thread's action bar, "plain" for comments. */
  appearance?: "plain" | "pill";
  /** Own posts and archived threads show the score with dimmed arrows. */
  disabled?: boolean;
  /** Arrow under the film's cursor: raised fill (pill) or hover fill (plain) and the vote color. */
  hover?: "up" | "down" | null;
  /** 44px arrows, as on phones. */
  touch?: boolean;
};

/**
 * ▲ score ▼ as on the live site (src/components/votes/vote-control.tsx): ArrowBig arrows, 18px icons
 * in 32px targets, three digit widths reserved so the arrows never move when the score grows.
 */
export function VoteControl({
  score,
  scoreNode,
  myVote = 0,
  appearance = "plain",
  disabled = false,
  hover = null,
  touch = false,
}: VoteControlProps) {
  const tone = toneOf(myVote);
  const pill = appearance === "pill";
  const arrow = (direction: "up" | "down") => {
    const active = (direction === "up" && myVote === 1) || (direction === "down" && myVote === -1);
    const hovered = hover === direction && !disabled;
    // cn() only joins, so exactly one colour class goes in; with two, stylesheet order would pick.
    const tinted = active || hovered;
    return cn(
      "inline-flex shrink-0 items-center justify-center [&_svg]:size-[1.125rem]",
      touch ? "size-11" : "size-8",
      pill ? "rounded-full" : "rounded-md",
      hovered && (pill ? "bg-raised shadow-[0_1px_2px_var(--shadow-color)]" : "bg-surface-hover"),
      tinted ? (direction === "up" ? tones.up.arrow : tones.down.arrow) : "text-muted",
      disabled && "opacity-40",
    );
  };
  const up = myVote === 1;
  const down = myVote === -1;

  return (
    <div className={cn("inline-flex items-center", pill ? "rounded-full p-0.5" : "gap-0.5", pill && tone.pill)}>
      <span data-anchor="vote-up" className={arrow("up")}>
        <ArrowBigUp strokeWidth={up ? 1.5 : 1.75} fill={up ? "currentColor" : "none"} aria-hidden />
      </span>
      <span
        data-anchor="vote-score"
        className={cn(
          "inline-block min-w-[3ch] text-center text-meta tabular-nums",
          pill ? "font-semibold" : "font-medium",
          tone.score,
        )}
      >
        {scoreNode ?? score}
      </span>
      <span data-anchor="vote-down" className={arrow("down")}>
        <ArrowBigDown strokeWidth={down ? 1.5 : 1.75} fill={down ? "currentColor" : "none"} aria-hidden />
      </span>
    </div>
  );
}
