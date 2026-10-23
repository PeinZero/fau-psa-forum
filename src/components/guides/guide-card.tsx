import { ArrowRight, CircleCheck, ListChecks, Star } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { cardClasses } from "@/components/ui/card";

import type { GuideSummary } from "./data";
import { ProgressBar } from "./progress-bar";

export function guideHref(slug: string): string {
  return `/guides/${slug}`;
}

export function GuideCard({ guide, showFeatured = true }: { guide: GuideSummary; showFeatured?: boolean }) {
  const finished = guide.doneCount !== null && guide.stepCount > 0 && guide.doneCount === guide.stepCount;
  return (
    <Link
      href={guideHref(guide.slug)}
      className={cardClasses({ interactive: true, className: "group flex h-full flex-col gap-3" })}
    >
      <span className="flex items-start gap-3">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted transition-colors duration-200 group-hover:border-accent/30 group-hover:text-accent"
        >
          <ListChecks strokeWidth={1.75} className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-medium text-foreground">{guide.title}</span>
            {showFeatured && guide.isFeatured && (
              <Badge variant="accent">
                <Star aria-hidden strokeWidth={1.75} />
                Featured
              </Badge>
            )}
          </span>
          {guide.summary && <span className="mt-0.5 line-clamp-2 block text-meta text-muted">{guide.summary}</span>}
        </span>
        <ArrowRight
          aria-hidden
          strokeWidth={1.75}
          className="mt-0.5 hidden size-4 shrink-0 -translate-x-1 text-subtle opacity-0 transition-[opacity,translate] duration-200 group-hover:translate-x-0 group-hover:opacity-100 sm:block"
        />
      </span>
      <span className="mt-auto flex flex-col gap-2">
        {guide.doneCount !== null && guide.stepCount > 0 && (
          // The count below says the same in words; the bar is only a visual cue inside the link.
          <span aria-hidden className="block">
            <ProgressBar done={guide.doneCount} total={guide.stepCount} label="Progress" />
          </span>
        )}
        <span className="flex items-center gap-2 text-meta tabular-nums text-subtle">
          {guide.stepCount} {guide.stepCount === 1 ? "step" : "steps"}
          {guide.doneCount !== null && guide.stepCount > 0 && (
            <>
              <span aria-hidden>·</span>
              {finished ? (
                <span className="inline-flex items-center gap-1 text-accent">
                  <CircleCheck aria-hidden strokeWidth={1.75} className="size-3.5" />
                  Completed
                </span>
              ) : (
                <span>
                  {guide.doneCount} of {guide.stepCount} done
                </span>
              )}
            </>
          )}
        </span>
      </span>
    </Link>
  );
}
