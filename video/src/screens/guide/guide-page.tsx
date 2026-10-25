import { Check, ChevronRight } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { clamp01 } from "../../lib/motion";
import { firstWeeksGuide, type GuideStep, progressLabel } from "./guide-data";

/*
 * The guide page (src/app/guides/[slug]/page.tsx with GuideProgressSummary, StepCheckbox and
 * StepTitle from src/components/guides/guide-progress.tsx) at the lg breakpoint, as a signed-in
 * member sees it. The steps show their title only: the bodies and linked threads are cropped out so
 * the checklist reads at phone size.
 */

/** Per-step build state for the film. */
export type GuideStepState = {
  /** The site's fade-up, 0–1. */
  appear?: number;
  /** How far the tick has filled the checkbox, 0–1. */
  checked?: number;
};

export type GuidePageProps = {
  steps?: GuideStepState[];
  /** The done count; a node allows rolling digits. */
  doneCount?: ReactNode;
  /** Width of the progress bar, 0–1. */
  progress?: number;
};

/** Page geometry in site px from the top of the page area (root layout's lg:py-10 included). */
export const GUIDE_LAYOUT = {
  /** Top edge of the progress summary card. */
  summaryTop: 198,
  /** First step's top edge and the distance between steps (checkbox, then pb-10). */
  firstStepTop: 298,
  stepPitch: 64,
  /** The reading column: max-w-3xl inside the page's px-6. */
  columnWidth: 768,
  pagePadding: 24,
  /** Checkbox centre relative to the step's top-left corner. */
  checkbox: { x: 12, y: 12 },
};

export const stepTop = (index: number) => GUIDE_LAYOUT.firstStepTop + GUIDE_LAYOUT.stepPitch * index;

/** Left edge of the reading column on a page `width` site px wide. */
export const columnLeft = (width: number) =>
  Math.max(GUIDE_LAYOUT.pagePadding, (width - GUIDE_LAYOUT.columnWidth) / 2);

function fadeUp(t: number): CSSProperties {
  return { opacity: t, transform: t < 1 ? `translateY(${(1 - t) * 8}px)` : undefined };
}

export function GuidePage({ steps = [], doneCount = 0, progress = 0 }: GuidePageProps) {
  const guide = firstWeeksGuide;
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <article className="flex flex-col">
          <nav aria-label="Breadcrumb">
            <ol className="flex min-w-0 items-center gap-1.5 text-meta text-muted">
              <li className="inline-flex shrink-0 items-center">Guides</li>
              <li className="flex min-w-0 items-center gap-1.5 text-subtle">
                <ChevronRight aria-hidden strokeWidth={1.75} className="size-3.5 shrink-0" />
                <span className="truncate">{guide.title}</span>
              </li>
            </ol>
          </nav>
          <header className="mt-4 flex flex-col gap-3">
            <h1 className="min-w-0 text-display font-semibold tracking-[-0.025em] break-words">{guide.title}</h1>
            <p className="max-w-2xl text-body text-muted">{guide.summary}</p>
          </header>

          <div className="mt-6 rounded-xl bg-surface/85 px-5 py-3">
            <ProgressSummary doneCount={doneCount} total={guide.steps.length} progress={progress} />
          </div>

          <ol className="mt-10 flex flex-col">
            {guide.steps.map((step, i) => (
              <StepItem
                key={step.title}
                step={step}
                number={i + 1}
                last={i === guide.steps.length - 1}
                state={steps[i] ?? {}}
              />
            ))}
          </ol>
        </article>
      </div>
    </div>
  );
}

function ProgressSummary({ doneCount, total, progress }: { doneCount: ReactNode; total: number; progress: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3 text-meta">
        <span className="font-medium text-foreground tabular-nums">
          {doneCount} {progressLabel(total)}
        </span>
      </div>
      <span className="block h-1.5 w-full overflow-hidden rounded-full bg-border">
        <span className="block h-full rounded-full bg-accent" style={{ width: `${clamp01(progress) * 100}%` }} />
      </span>
    </div>
  );
}

function StepItem({ step, number, last, state }: { step: GuideStep; number: number; last: boolean; state: GuideStepState }) {
  const { appear = 1, checked = 0 } = state;
  return (
    <li className={last ? "relative flex gap-4" : "relative flex gap-4 pb-10"} style={fadeUp(appear)}>
      {!last && <span aria-hidden className="absolute bottom-0 left-[11.5px] top-9 w-px bg-border" />}
      <StepCheckbox number={number} checked={checked} />
      <div className="min-w-0 flex-1">
        <StepTitle checked={checked}>{step.title}</StepTitle>
      </div>
    </li>
  );
}

/** The site's round checkbox: number at rest, emerald fill with a check once ticked. */
function StepCheckbox({ number, checked }: { number: number; checked: number }) {
  const t = clamp01(checked);
  return (
    <span className="relative -m-2.5 inline-flex size-11 shrink-0 items-center justify-center">
      <span
        className="size-6 rounded-full border-[1.5px]"
        style={{
          borderColor: `color-mix(in srgb, var(--accent) ${t * 100}%, var(--border-strong))`,
          backgroundColor: `color-mix(in srgb, var(--accent) ${t * 100}%, var(--surface))`,
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute text-[11px] font-semibold tabular-nums text-muted"
        style={{ opacity: 1 - t }}
      >
        {number}
      </span>
      <Check
        aria-hidden
        strokeWidth={2.5}
        className="pointer-events-none absolute size-3.5 text-accent-foreground"
        style={{ opacity: t }}
      />
    </span>
  );
}

/** Done steps turn muted and struck through. */
function StepTitle({ checked, children }: { checked: number; children: ReactNode }) {
  const t = clamp01(checked);
  return (
    <h2
      className="text-title font-semibold break-words"
      style={{
        color: `color-mix(in srgb, var(--muted) ${t * 100}%, var(--foreground))`,
        textDecorationLine: t > 0 ? "line-through" : "none",
        textDecorationColor: `color-mix(in srgb, var(--subtle) ${t * 100}%, transparent)`,
      }}
    >
      {children}
    </h2>
  );
}
