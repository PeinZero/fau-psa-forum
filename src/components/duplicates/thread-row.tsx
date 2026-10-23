import { CheckCircle2, MessageSquare } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import type { SimilarThread } from "./types";

/** Title link plus category, best-answer and comment-count facts. Opens in a new tab so a draft is never lost. */
export function SimilarThreadRow({ thread }: { thread: SimilarThread }) {
  const comments = `${thread.commentCount} ${thread.commentCount === 1 ? "comment" : "comments"}`;
  return (
    <div className="min-w-0">
      <a
        href={`/t/${thread.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="break-words text-body font-medium hover:underline"
      >
        {thread.title}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted">
        {thread.category ? <Badge>{thread.category.name}</Badge> : null}
        {thread.hasBestAnswer ? (
          <Badge variant="accent">
            <CheckCircle2 aria-hidden strokeWidth={1.75} />
            Best answer
          </Badge>
        ) : null}
        <span className="inline-flex items-center gap-1">
          <MessageSquare aria-hidden strokeWidth={1.75} className="size-3.5" />
          {comments}
        </span>
      </p>
    </div>
  );
}
