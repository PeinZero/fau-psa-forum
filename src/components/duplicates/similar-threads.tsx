"use client";

import { Lightbulb } from "lucide-react";

import { SimilarThreadRow } from "./thread-row";
import { useSimilarThreads } from "./use-similar-threads";

/** Live region under the title field; never blocks submitting. */
export function SimilarThreads({ title }: { title: string }) {
  const { enabled, loading, failed, results } = useSimilarThreads(title);
  const count = results.length;

  const status = enabled && !loading && !failed && count ? `${count} similar ${count === 1 ? "thread" : "threads"} found` : "";

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {status}
      </p>
      {count > 0 ? (
        <section
          aria-labelledby="similar-threads-heading"
          className="animate-fade-up rounded-lg border border-border bg-accent-soft/40 p-3 sm:p-4"
        >
          <p className="flex items-start gap-2 text-meta font-medium">
            <Lightbulb aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0 text-accent" />
            Your question may already be answered. Check these first.
          </p>
          <h3 id="similar-threads-heading" className="mt-3 text-meta font-medium text-muted">
            Similar threads
          </h3>
          <ul className="mt-2 grid gap-3" aria-busy={loading}>
            {results.map((thread) => (
              <li key={thread.slug} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                <SimilarThreadRow thread={thread} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
