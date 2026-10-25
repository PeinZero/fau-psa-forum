import { CircleCheck, MessageSquare } from "lucide-react";

import { CategoryGlyph } from "@/components/thread/category-icon";
import { Badge } from "@/components/ui/badge";
import { cityLabels, countLabel } from "@/lib/labels";

import type { SimilarThread } from "./types";

/** Title link plus category, city, answered and comment facts. Opens in a new tab so a draft is never lost. */
export function SimilarThreadRow({ thread }: { thread: SimilarThread }) {
  return (
    <div className="min-w-0">
      <a
        href={`/t/${thread.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="break-words rounded-sm text-body font-medium text-foreground underline-offset-2 decoration-border-strong transition-colors duration-150 hover:text-accent hover:underline"
      >
        {thread.title}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted">
        {thread.category ? (
          <span className="inline-flex items-center gap-1.5">
            <CategoryGlyph slug={thread.category.slug} className="size-3.5 text-subtle" />
            {thread.category.name}
          </span>
        ) : null}
        {thread.city ? <span>{cityLabels[thread.city]}</span> : null}
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <MessageSquare aria-hidden strokeWidth={1.75} className="size-3.5 text-subtle" />
          {countLabel(thread.commentCount, "comment")}
        </span>
        {thread.hasBestAnswer ? (
          <Badge variant="accent">
            <CircleCheck aria-hidden strokeWidth={1.75} />
            Answered
          </Badge>
        ) : null}
      </p>
    </div>
  );
}
