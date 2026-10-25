import { CircleCheck, MessagesSquare, PenLine, type LucideIcon } from "lucide-react";

import { countLabel } from "@/lib/labels";

export const POPULAR_LIMIT = 5;
export const START_HERE_LIMIT = 2;
export const MODERATOR_AVATARS = 6;

/** Hot threads first; a young forum without enough activity tops the list up with the newest ones. */
export function fillPopular<T extends { id: number }>(hot: readonly T[], newest: readonly T[], limit = POPULAR_LIMIT): T[] {
  const seen = new Set(hot.map((thread) => thread.id));
  return [...hot, ...newest.filter((thread) => !seen.has(thread.id))].slice(0, limit);
}

/** An answered question says so; otherwise its comment count, and nothing at zero. */
export function popularStatus({ best_comment_id, comment_count }: { best_comment_id: number | null; comment_count: number }) {
  if (best_comment_id !== null) return { answered: true, label: "Answered" } as const;
  if (comment_count > 0) return { answered: false, label: countLabel(comment_count, "comment") } as const;
  return null;
}

/** Empty categories show no count rather than "0 threads". */
export function topicCountLabel(threadCount: number): string | null {
  return threadCount > 0 ? countLabel(threadCount, "thread") : null;
}

/** Applying happens on the account page, which needs a session first. */
export function moderatorApplyHref(signedIn: boolean): string {
  return signedIn ? "/account" : `/login?next=${encodeURIComponent("/account")}`;
}

/** The avatar row shows a few faces and folds the rest into "+N". */
export function avatarOverflow(total: number, shown: number): number {
  return Math.max(0, total - shown);
}

export type HowItWorksStep = { title: string; body: string; icon: LucideIcon };

export const howItWorksSteps: readonly HowItWorksStep[] = [
  {
    title: "Ask",
    body: "Post your question; a moderator checks it before it goes live.",
    icon: PenLine,
  },
  {
    title: "Community answers & votes",
    body: "Students who have been through it reply, and the best answers rise.",
    icon: MessagesSquare,
  },
  {
    title: "Moderators review & verify",
    body: "Answers get marked, kept current and verified for the next newcomer.",
    icon: CircleCheck,
  },
];
