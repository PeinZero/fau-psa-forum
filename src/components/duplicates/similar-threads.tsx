"use client";

import { Lightbulb } from "lucide-react";
import { useId } from "react";

import { cn } from "@/components/ui/cn";
import { countLabel } from "@/lib/labels";

import { SimilarThreadRow } from "./thread-row";
import { useSimilarThreads } from "./use-similar-threads";

/** Live suggestions under the title field; never blocks submitting. */
export function SimilarThreads({ title }: { title: string }) {
  const headingId = useId();
  const { enabled, loading, failed, results } = useSimilarThreads(title);
  const count = results.length;

  const status = enabled && !loading && !failed && count ? `${countLabel(count, "similar thread")} found` : "";

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {status}
      </p>
      {count > 0 ? (
        <section
          aria-labelledby={headingId}
          aria-busy={loading}
          className="mt-2 animate-fade-up rounded-lg bg-accent-soft px-3 py-3 ring-1 ring-accent/15 sm:px-4"
        >
          <div className="flex items-start gap-2">
            <Lightbulb aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0 text-accent" />
            <div className="min-w-0">
              <h3 id={headingId} className="text-small font-medium text-foreground">
                Already asked?
              </h3>
              <p className="text-meta text-muted">These threads look similar. They open in a new tab, so your draft stays.</p>
            </div>
          </div>
          <ul className={cn("mt-3 grid gap-3 transition-opacity duration-150", loading && "opacity-60")}>
            {results.map((thread) => (
              <li key={thread.slug} className="border-t border-accent/10 pt-3 first:border-t-0 first:pt-0 sm:pl-6">
                <SimilarThreadRow thread={thread} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
