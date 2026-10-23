import { SimilarThreadRow } from "./thread-row";
import type { SimilarThread } from "./types";
import { CopyReason } from "./copy-reason";

/** Moderator hint on a pending thread: existing published threads that may already answer it. */
export function PossibleDuplicates({ threads }: { threads: SimilarThread[] }) {
  if (!threads.length) return null;
  return (
    <section aria-label="Possible duplicates" className="rounded-lg border border-border bg-background p-3">
      <h3 className="text-meta font-medium text-muted">Possible duplicates</h3>
      <ul className="mt-2 grid gap-3">
        {threads.map((thread) => (
          <li
            key={thread.slug}
            className="flex flex-wrap items-start justify-between gap-2 border-t border-border pt-3 first:border-t-0 first:pt-0"
          >
            <div className="min-w-0 flex-1 basis-56">
              <SimilarThreadRow thread={thread} />
            </div>
            <CopyReason slug={thread.slug} title={thread.title} />
          </li>
        ))}
      </ul>
    </section>
  );
}
