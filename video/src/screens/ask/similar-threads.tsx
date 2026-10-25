import { CircleCheck, Lightbulb, MessageSquare } from "lucide-react";

import { Badge } from "../../ui/badge";
import { CategoryGlyph } from "../../ui/category-glyph";
import { cityLabels, type DemoThread } from "../demo-data";

/*
 * The live suggestions under the ask form's title (src/components/duplicates/similar-threads.tsx and
 * thread-row.tsx). The site looks them up once typing pauses for 300 ms with at least 8 characters,
 * fades the box up when matches arrive, and dims the list while the next lookup runs.
 */

export type SimilarThreadsProps = {
  threads: DemoThread[];
  /** Entrance, 0 → 1: the box fades up 6px; the film also lets the space open instead of jumping. */
  appear: number;
  /** Space the box takes, 0 → 1 (usually a little ahead of `appear`). */
  open: number;
  /** List opacity: 0.6 while a newer lookup runs, 1 once it is answered. */
  listOpacity: number;
};

export function SimilarThreads({ threads, appear, open, listOpacity }: SimilarThreadsProps) {
  if (open <= 0) return null;
  return (
    // The title field's column has a 6px gap and the box its own 8px margin; both open with it.
    // The 1px bleed keeps the box's outer ring clear of the clip.
    <div style={{ display: "grid", gridTemplateRows: `${open}fr`, margin: "-6px -1px -1px" }}>
      <div style={{ minHeight: 0, overflow: "hidden", padding: "14px 1px 1px" }}>
        <section
          data-anchor="similar"
          className="rounded-lg bg-accent-soft px-4 py-3 ring-1 ring-accent/15"
          style={{ opacity: appear, transform: appear < 1 ? `translateY(${(1 - appear) * 6}px)` : undefined }}
        >
          <div className="flex items-start gap-2">
            <Lightbulb aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0 text-accent" />
            <div className="min-w-0">
              <h3 className="text-small font-medium text-foreground">Already asked?</h3>
              <p className="text-meta text-muted">These threads look similar. They open in a new tab, so your draft stays.</p>
            </div>
          </div>
          <ul className="mt-3 grid gap-3" style={{ opacity: listOpacity }}>
            {threads.map((thread) => (
              <li key={thread.slug} className="border-t border-accent/10 pt-3 pl-6 first:border-t-0 first:pt-0">
                <SimilarThreadRow thread={thread} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/** Title link plus category, city, comment count and the Answered pill. */
export function SimilarThreadRow({ thread }: { thread: DemoThread }) {
  return (
    <div className="min-w-0">
      <span data-anchor="similar-title" className="break-words text-body font-medium text-foreground">
        {thread.title}
      </span>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted">
        <span className="inline-flex items-center gap-1.5">
          <CategoryGlyph slug={thread.category.slug} className="size-3.5 text-subtle" />
          {thread.category.name}
        </span>
        {thread.city ? <span>{cityLabels[thread.city]}</span> : null}
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <MessageSquare aria-hidden strokeWidth={1.75} className="size-3.5 text-subtle" />
          {thread.commentCount === 1 ? "1 comment" : `${thread.commentCount} comments`}
        </span>
        {thread.bestCommentId !== null ? (
          <Badge variant="accent">
            <CircleCheck aria-hidden strokeWidth={1.75} />
            Answered
          </Badge>
        ) : null}
      </p>
    </div>
  );
}
