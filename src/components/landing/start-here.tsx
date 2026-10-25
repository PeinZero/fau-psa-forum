import { CircleCheck, ListChecks } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { guideHref, guideProgress } from "@/components/guides/guide-card";
import { ProgressBar } from "@/components/guides/progress-bar";
import { cn } from "@/components/ui/cn";

import { CardArrow, LandingSection } from "./section";
import { type HomeGuide, START_HERE_LIMIT } from "./shape";

const title = "New in Erlangen or Nuremberg? Start here";
const description = "Step-by-step checklists for your first weeks, linked to the threads that explain each step.";

export const landingCard =
  "group relative flex h-full flex-col rounded-xl border border-border bg-surface transition-[background-color,border-color] duration-150 ease-out hover:border-border-strong/40 hover:bg-surface-hover active:bg-surface-hover/70";

type ProgressSlot = (guide: HomeGuide) => ReactNode;

/** Without a viewer every guide shows only its step count, which is also what the slot shows while the session is read. */
const stepCountOnly: ProgressSlot = (guide) => <GuideProgressLine stepCount={guide.stepIds.length} doneCount={null} />;

/** Hidden until moderators publish a guide. `progress` fills each card's fixed-height progress line. */
export function StartHereView({ guides, progress = stepCountOnly }: { guides: readonly HomeGuide[]; progress?: ProgressSlot }) {
  if (guides.length === 0) return null;
  return (
    <LandingSection id="start-here" title={title} description={description} link={{ href: "/guides", label: "All guides" }}>
      <ul className="grid gap-4 md:grid-cols-2">
        {guides.slice(0, START_HERE_LIMIT).map((guide) => (
          <li key={guide.id}>
            <StartHereCard guide={guide} progress={progress(guide)} />
          </li>
        ))}
      </ul>
    </LandingSection>
  );
}

function StartHereCard({ guide, progress }: { guide: HomeGuide; progress: ReactNode }) {
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
        {/* One meta line tall whatever arrives, so a member's progress replaces the step count without a jump. */}
        <span className="flex h-5 min-w-0 flex-1 items-center gap-3 overflow-hidden">{progress}</span>
        <CardArrow />
      </span>
    </Link>
  );
}

export function GuideProgressLine({ stepCount, doneCount }: { stepCount: number; doneCount: number | null }) {
  const { tracked, finished, label } = guideProgress({ stepCount, doneCount });
  return (
    <>
      {tracked && (
        // The label beside it says the same in words.
        <span aria-hidden className="block w-full max-w-36">
          <ProgressBar done={doneCount ?? 0} total={stepCount} label="Progress" />
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
    </>
  );
}
