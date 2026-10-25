import { CircleCheck, ListChecks } from "lucide-react";
import Link from "next/link";

import type { GuideSummary } from "@/components/guides/data";
import { guideHref, guideProgress } from "@/components/guides/guide-card";
import { ProgressBar } from "@/components/guides/progress-bar";
import { cn } from "@/components/ui/cn";
import { stagger } from "@/components/ui/motion";
import { Skeleton } from "@/components/ui/skeleton";

import { CardArrow, LandingSection } from "./section";
import { START_HERE_LIMIT } from "./shape";

const title = "New in Erlangen or Nuremberg? Start here";
const description = "Step-by-step checklists for your first weeks, linked to the threads that explain each step.";

export const landingCard =
  "group relative flex h-full flex-col rounded-xl border border-border bg-surface transition-[background-color,border-color] duration-150 ease-out hover:border-border-strong/40 hover:bg-surface-hover active:bg-surface-hover/70";

/** Hidden until moderators publish a guide. */
export function StartHereView({ guides }: { guides: readonly GuideSummary[] }) {
  if (guides.length === 0) return null;
  return (
    <LandingSection id="start-here" title={title} description={description} link={{ href: "/guides", label: "All guides" }}>
      <ul className="grid gap-4 md:grid-cols-2">
        {guides.slice(0, START_HERE_LIMIT).map((guide, i) => (
          <li key={guide.id} className="animate-fade-up" style={stagger(i)}>
            <StartHereCard guide={guide} />
          </li>
        ))}
      </ul>
    </LandingSection>
  );
}

function StartHereCard({ guide }: { guide: GuideSummary }) {
  const { tracked, finished, label } = guideProgress(guide);
  return (
    <Link href={guideHref(guide.slug)} className={cn(landingCard, "p-5 sm:p-6")}>
      <span
        aria-hidden
        className="flex size-10 items-center justify-center rounded-lg bg-accent-soft text-accent ring-1 ring-accent/15 ring-inset"
      >
        <ListChecks strokeWidth={1.75} className="size-5" />
      </span>
      <span className="mt-5 block text-heading font-semibold text-pretty break-words text-foreground">{guide.title}</span>
      {guide.summary && <span className="mt-1.5 line-clamp-2 text-small text-pretty text-muted">{guide.summary}</span>}
      <span className="mt-auto flex items-center gap-4 pt-6">
        <span className="flex min-w-0 flex-1 items-center gap-3">
          {tracked && (
            // The label beside it says the same in words.
            <span aria-hidden className="block w-full max-w-36">
              <ProgressBar done={guide.doneCount ?? 0} total={guide.stepCount} label="Progress" />
            </span>
          )}
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 text-meta font-medium tabular-nums",
              finished ? "text-accent" : "text-muted",
            )}
          >
            {finished && <CircleCheck aria-hidden strokeWidth={1.75} className="size-3.5" />}
            {label}
          </span>
        </span>
        <CardArrow />
      </span>
    </Link>
  );
}

export function StartHereSkeleton() {
  return (
    <LandingSection id="start-here" title={title} description={description} link={{ href: "/guides", label: "All guides" }} busy>
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-[13.5rem] rounded-xl border border-border bg-surface p-5 sm:p-6">
            <Skeleton className="size-10 rounded-lg" />
            <Skeleton className="mt-6 h-5 w-2/3" />
            <Skeleton className="mt-3 h-3.5 w-full" />
            <Skeleton className="mt-2 h-3.5 w-4/5" />
          </div>
        ))}
      </div>
    </LandingSection>
  );
}
