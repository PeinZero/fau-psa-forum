import { CircleCheck, ListChecks } from "lucide-react";
import Link from "next/link";

import { cn } from "@/components/ui/cn";
import { countLabel } from "@/lib/labels";

import type { GuideSummary } from "./data";
import { ProgressBar } from "./progress-bar";

export function guideHref(slug: string): string {
  return `/guides/${slug}`;
}

type GuideProgress = Pick<GuideSummary, "stepCount" | "doneCount">;

/** Where a guide stands for the viewer: signed-out visitors (null) and empty guides show only the step count. */
export function guideProgress({ stepCount, doneCount }: GuideProgress) {
  const tracked = doneCount !== null && stepCount > 0;
  const finished = tracked && doneCount >= stepCount;
  const steps = countLabel(stepCount, "step");
  const label = !tracked ? steps : finished ? `All ${steps} done` : `${doneCount} of ${steps} done`;
  return { tracked, finished, label };
}

function ProgressMeta({ guide, className }: { guide: GuideProgress; className?: string }) {
  const { tracked, finished, label } = guideProgress(guide);
  return (
    <span className={cn("flex flex-col gap-2", className)}>
      {tracked && (
        // The line below says the same in words; the bar is only a visual cue inside the link.
        <span aria-hidden className="block">
          <ProgressBar done={guide.doneCount ?? 0} total={guide.stepCount} label="Progress" />
        </span>
      )}
      <span className={cn("inline-flex items-center gap-1.5 text-meta tabular-nums", finished ? "text-accent" : "text-muted")}>
        {finished && <CircleCheck aria-hidden strokeWidth={1.75} className="size-3.5" />}
        {label}
      </span>
    </span>
  );
}

function GuideIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-md bg-raised text-muted transition-colors duration-150 ease-out group-hover:text-accent",
        className,
      )}
    >
      <ListChecks strokeWidth={1.75} className="size-4" />
    </span>
  );
}

/** A featured guide: a calm `surface` card with the summary and the viewer's progress. */
export function GuideCard({ guide }: { guide: GuideSummary }) {
  return (
    <Link
      href={guideHref(guide.slug)}
      className="group flex h-full flex-col gap-4 rounded-xl bg-surface px-4 py-4 transition-colors duration-150 ease-out hover:bg-surface-hover active:bg-surface-hover/70 sm:px-5"
    >
      <span className="flex items-start gap-3">
        <GuideIcon />
        <span className="min-w-0 flex-1">
          <span className="block text-title font-semibold text-pretty break-words text-foreground">{guide.title}</span>
          {guide.summary && <span className="mt-1 line-clamp-2 text-small text-muted">{guide.summary}</span>}
        </span>
      </span>
      <ProgressMeta guide={guide} className="mt-auto" />
    </Link>
  );
}

/** Every other guide: a hairline-divided row, inside a `<ul>` with `divide-y`. */
export function GuideRow({ guide }: { guide: GuideSummary }) {
  return (
    <Link
      href={guideHref(guide.slug)}
      className="group flex items-start gap-4 rounded-lg px-3 py-4 transition-colors duration-150 ease-out hover:bg-surface-hover focus-visible:-outline-offset-2 sm:px-4"
    >
      <GuideIcon />
      <span className="min-w-0 flex-1">
        <span className="block text-title font-semibold text-pretty break-words text-foreground">{guide.title}</span>
        {guide.summary && <span className="mt-1 line-clamp-2 text-small text-muted">{guide.summary}</span>}
        <ProgressMeta guide={guide} className="mt-2 max-w-60" />
      </span>
    </Link>
  );
}
