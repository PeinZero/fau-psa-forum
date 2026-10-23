"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";

import { cn } from "@/components/ui/cn";

import { castVote, type VoteValue } from "./actions";

type Props = {
  commentId: number;
  score: number;
  myVote: VoteValue;
  signedIn: boolean;
  /** Own comments, archived threads and hidden comments show the score without voting. */
  disabled?: boolean;
};

type Tally = { score: number; myVote: VoteValue };

const arrow =
  "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted pointer-coarse:size-11 " +
  "transition-[background-color,color] duration-150 ease-out hover:bg-surface-hover hover:text-foreground " +
  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring " +
  "disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4";

export function VoteControl({ commentId, score, myVote, signedIn, disabled = false }: Props) {
  const pathname = usePathname();
  const [confirmed, setConfirmed] = useState<Tally>({ score, myVote });
  const [seenProps, setSeenProps] = useState<Tally>({ score, myVote });
  const [shown, setShown] = useOptimistic(confirmed);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // A server re-render (new comment, router.refresh) brings fresher numbers than ours.
  if (seenProps.score !== score || seenProps.myVote !== myVote) {
    setSeenProps({ score, myVote });
    setConfirmed({ score, myVote });
  }

  const scoreRef = useBump(shown.score);

  function cast(direction: 1 | -1) {
    if (pending || disabled) return;
    const value: VoteValue = shown.myVote === direction ? 0 : direction;
    const next = { score: shown.score - shown.myVote + value, myVote: value };
    setError(null);
    startTransition(async () => {
      setShown(next);
      const result = await castVote({ commentId, value });
      if (result.ok) {
        startTransition(() => setConfirmed({ score: result.score, myVote: result.myVote }));
      } else {
        setError(result.message);
      }
    });
  }

  const scoreTone = shown.myVote === 1 ? "text-accent" : shown.myVote === -1 ? "text-danger" : "text-foreground";
  const scoreLabel = (
    <span
      ref={scoreRef}
      aria-live="polite"
      className={cn(
        "inline-block min-w-[2ch] text-center text-meta font-medium tabular-nums transition-opacity duration-150",
        scoreTone,
        pending && "opacity-60",
      )}
    >
      {shown.score}
      <span className="sr-only">{Math.abs(shown.score) === 1 ? " point" : " points"}</span>
    </span>
  );

  if (!signedIn && !disabled) {
    const href = `/login?next=${encodeURIComponent(`${pathname}#comment-${commentId}`)}`;
    return (
      <div role="group" aria-label="Vote" className="inline-flex items-center gap-0.5">
        <Link href={href} aria-label="Sign in to upvote" title="Sign in to vote" className={arrow}>
          <ChevronUp strokeWidth={1.75} aria-hidden />
        </Link>
        {scoreLabel}
        <Link href={href} aria-label="Sign in to downvote" title="Sign in to vote" className={arrow}>
          <ChevronDown strokeWidth={1.75} aria-hidden />
        </Link>
      </div>
    );
  }

  return (
    <div className="inline-flex flex-wrap items-center gap-x-2">
      <div
        role="group"
        aria-label="Vote"
        aria-busy={pending || undefined}
        title={disabled ? "Voting isn't available on this comment" : undefined}
        className="inline-flex items-center gap-0.5"
      >
        <button
          type="button"
          aria-label="Upvote"
          aria-pressed={shown.myVote === 1}
          disabled={disabled}
          onClick={() => cast(1)}
          className={cn(arrow, shown.myVote === 1 && "text-accent hover:text-accent")}
        >
          <ChevronUp strokeWidth={shown.myVote === 1 ? 2.5 : 1.75} aria-hidden />
        </button>
        {scoreLabel}
        <button
          type="button"
          aria-label="Downvote"
          aria-pressed={shown.myVote === -1}
          disabled={disabled}
          onClick={() => cast(-1)}
          className={cn(arrow, shown.myVote === -1 && "text-danger hover:text-danger")}
        >
          <ChevronDown strokeWidth={shown.myVote === -1 ? 2.5 : 1.75} aria-hidden />
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
