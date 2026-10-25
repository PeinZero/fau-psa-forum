import { CircleCheck, MessagesSquare, PenLine, type LucideIcon } from "lucide-react";

import { countLabel } from "@/lib/labels";

export const POPULAR_LIMIT = 5;
export const START_HERE_LIMIT = 2;
export const MODERATOR_AVATARS = 6;

/** A featured guide as every visitor sees it; the viewer's own progress is looked up separately. */
export type HomeGuide = { id: number; slug: string; title: string; summary: string | null; stepIds: number[] };

export function toHomeGuides(
  rows: readonly { id: number; slug: string; title: string; summary: string | null; guide_steps: readonly { id: number }[] }[],
): HomeGuide[] {
  return rows.map(({ guide_steps, ...guide }) => ({ ...guide, stepIds: guide_steps.map((step) => step.id) }));
}

/** How many of a guide's steps the viewer has finished. */
export function countDone(stepIds: readonly number[], done: ReadonlySet<number>): number {
  return stepIds.filter((id) => done.has(id)).length;
}

export type HomeTopic = { id: number; slug: string; name: string; description: string | null; threadCount: number };

/** The embedded count only covers published threads, and a category without any comes back empty. */
export function toTopics(
  rows: readonly { id: number; slug: string; name: string; description: string | null; threads: readonly { count: number }[] }[],
): HomeTopic[] {
  return rows.map(({ threads, ...category }) => ({ ...category, threadCount: threads[0]?.count ?? 0 }));
}

/** Rows loaded by id come back unordered; this restores the ranking and drops ids that no longer resolve. */
export function orderByIds<T extends { id: number }>(ids: readonly number[], rows: readonly T[]): T[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}

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
