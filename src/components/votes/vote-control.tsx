"use client";

import { ArrowBigDown, ArrowBigUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/components/ui/cn";

import { castVote, type CastVoteResult, type VoteValue } from "./actions";
import { nextVote, scoreAfter } from "./vote-math";

type Target =
  | { commentId: number; onVote?: never }
  | { commentId?: never; onVote: (value: VoteValue) => Promise<CastVoteResult> };

type Props = Target & {
  score: number;
  myVote: VoteValue;
  signedIn: boolean;
  /** Own posts, archived threads and hidden comments show the score without voting. */
  disabled?: boolean;
  disabledTitle?: string;
  /** "pill" sits on a soft rounded surface, for the thread's action bar; "plain" is for comments. */
  appearance?: "plain" | "pill";
};

type Tally = { score: number; myVote: VoteValue };

const FAILED = "Your vote didn't go through. Please try again.";

// 32px for a mouse, 44px for a finger.
const arrowBase =
  "inline-flex size-8 shrink-0 items-center justify-center text-muted pointer-coarse:size-11 " +
  "transition-[background-color,color] duration-150 ease-out " +
  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring " +
  "disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-[1.125rem]";

const looks = {
  plain: { group: "gap-0.5", arrow: cn(arrowBase, "rounded-md hover:bg-surface-hover") },
  pill: {
    group: "rounded-full p-0.5 transition-colors duration-150 ease-out",
    arrow: cn(arrowBase, "rounded-full hover:bg-raised hover:shadow-[0_1px_2px_var(--shadow-color)]"),
  },
};

const tones = {
  up: { arrow: "text-accent", score: "text-accent", pill: "bg-accent-soft" },
  down: { arrow: "text-danger", score: "text-danger", pill: "bg-danger/10" },
  none: { arrow: "", score: "text-foreground", pill: "bg-surface" },
};

const toneOf = (vote: VoteValue) => (vote === 1 ? tones.up : vote === -1 ? tones.down : tones.none);

export function VoteControl(props: Props) {
  const {
    score,
    myVote,
    signedIn,
    disabled = false,
    disabledTitle = "Voting isn't available on this comment",
    appearance = "plain",
  } = props;
  const pathname = usePathname();
  const [seenProps, setSeenProps] = useState<Tally>({ score, myVote });
  const [tally, setTally] = useState<{ shown: Tally; confirmed: Tally }>(() => ({
    shown: { score, myVote },
    confirmed: { score, myVote },
  }));
  const [inFlight, setInFlight] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);

  // A server re-render (a new comment, a moderator action) brings fresher numbers than ours.
  if (seenProps.score !== score || seenProps.myVote !== myVote) {
    setSeenProps({ score, myVote });
    setTally({ shown: { score, myVote }, confirmed: { score, myVote } });
  }

  const shown = tally.shown;
  const scoreRef = useBump(shown.score);

  // Every click counts, even while an earlier vote is still on its way: the server handles them in
  // order, and the newest answer is the one the control settles on.
  async function cast(clicked: 1 | -1) {
    if (disabled) return;
    const to = nextVote(shown.myVote, clicked);
    const optimistic = { score: scoreAfter(shown.score, shown.myVote, to), myVote: to };
    const request = ++latestRequest.current;
    setError(null);
    setTally((current) => ({ ...current, shown: optimistic }));
    setInFlight((count) => count + 1);

    let result: CastVoteResult;
    try {
      result = props.onVote ? await props.onVote(to) : await castVote({ commentId: props.commentId, value: to });
    } catch {
      result = { ok: false, message: FAILED };
    }
    setInFlight((count) => count - 1);

    const isLatest = request === latestRequest.current;
    if (result.ok) {
      const truth = { score: result.score, myVote: result.myVote };
      setTally((current) => ({ confirmed: truth, shown: isLatest ? truth : current.shown }));
    } else if (isLatest) {
      setTally((current) => ({ ...current, shown: current.confirmed }));
      setError(result.message);
    }
  }

  const look = looks[appearance];
  const tone = toneOf(shown.myVote);
  const scoreLabel = (
    <span
      ref={scoreRef}
      aria-live="polite"
      className={cn(
        // Three digit widths reserved, so 9 → 10 or 1 → -1 never nudges the arrows.
        "inline-block min-w-[3ch] text-center text-meta tabular-nums transition-colors duration-150 ease-out",
        appearance === "pill" ? "font-semibold" : "font-medium",
        tone.score,
      )}
    >
      {shown.score}
      <span className="sr-only">{Math.abs(shown.score) === 1 ? " point" : " points"}</span>
    </span>
  );
  const groupClass = cn("inline-flex items-center", look.group, appearance === "pill" && tone.pill);

  if (!signedIn && !disabled) {
    const fragment = props.onVote ? "" : `#comment-${props.commentId}`;
    const href = `/login?next=${encodeURIComponent(`${pathname}${fragment}`)}`;
    return (
      <div role="group" aria-label="Vote" className={groupClass}>
        <Link href={href} aria-label="Sign in to upvote" title="Sign in to vote" className={cn(look.arrow, "hover:text-accent")}>
          <ArrowBigUp strokeWidth={1.75} aria-hidden />
        </Link>
        {scoreLabel}
        <Link href={href} aria-label="Sign in to downvote" title="Sign in to vote" className={cn(look.arrow, "hover:text-danger")}>
          <ArrowBigDown strokeWidth={1.75} aria-hidden />
        </Link>
      </div>
    );
  }

  const up = shown.myVote === 1;
  const down = shown.myVote === -1;
  return (
    <div className="inline-flex flex-wrap items-center gap-x-2">
      <div
        role="group"
        aria-label="Vote"
        aria-busy={inFlight > 0 || undefined}
        title={disabled ? disabledTitle : undefined}
        className={groupClass}
      >
        <button
          type="button"
          aria-label="Upvote"
          aria-pressed={up}
          disabled={disabled}
          onClick={() => void cast(1)}
          className={cn(look.arrow, "hover:text-accent", up && tones.up.arrow)}
        >
          <ArrowBigUp strokeWidth={up ? 1.5 : 1.75} fill={up ? "currentColor" : "none"} aria-hidden />
        </button>
        {scoreLabel}
        <button
          type="button"
          aria-label="Downvote"
          aria-pressed={down}
          disabled={disabled}
          onClick={() => void cast(-1)}
          className={cn(look.arrow, "hover:text-danger", down && tones.down.arrow)}
        >
          <ArrowBigDown strokeWidth={down ? 1.5 : 1.75} fill={down ? "currentColor" : "none"} aria-hidden />
        </button>
      </div>
      {error ? (
        <span role="alert" className="text-meta text-danger">
          {error}
        </span>
      ) : null}
    </div>
  );
}

/** A small nudge in the direction the score moved; skipped for reduced motion. */
function useBump(value: number) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    const element = ref.current;
    if (from === value || !element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const offset = value > from ? "-3px" : "3px";
    element.animate(
      [
        { transform: `translateY(${offset})`, opacity: 0.5 },
        { transform: "translateY(0)", opacity: 1 },
      ],
      { duration: 180, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    );
  }, [value]);

  return ref;
}
