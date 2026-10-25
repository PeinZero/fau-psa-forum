import { ChevronRight, CircleCheck, MessageSquare, Pencil } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { fetchDoneStepIds, getGuide, type GuideDetail, type GuideStep } from "@/components/guides/data";
import {
  GuideProgressProvider,
  GuideProgressSummary,
  StepCheckbox,
  StepTitle,
} from "@/components/guides/guide-progress";
import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { cardClasses } from "@/components/ui/card";
import { stagger } from "@/components/ui/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { getEffectiveViewer, getViewer, isModerator } from "@/lib/auth/viewer";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuide(slug);
  if (!guide) return {};

  const description = guide.summary || `A step-by-step guide in ${guide.steps.length} steps.`;
  return {
    title: guide.title,
    description,
    openGraph: {
      type: "article",
      siteName: "PSA FAU Community Forum",
      title: guide.title,
      description,
      modifiedTime: guide.updated_at,
      url: `/guides/${guide.slug}`,
    },
  };
}

export default function GuidePage({ params }: { params: Params }) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <Suspense fallback={<GuideSkeleton />}>
        <GuideContent params={params} />
      </Suspense>
    </div>
  );
}

async function GuideContent({ params }: { params: Params }) {
  const { slug } = await params;
  const [guide, viewer] = await Promise.all([getGuide(slug), getViewer()]);
  if (!guide) notFound();

  const stepIds = guide.steps.map((step) => step.id);
  const initialDone = viewer ? [...(await fetchDoneStepIds(viewer.userId, stepIds))] : [];

  return (
    <article className="flex flex-col">
      <nav aria-label="Breadcrumb">
        <ol className="flex min-w-0 items-center gap-1.5 text-meta text-muted">
          <li className="shrink-0">
            <Link href="/guides" className="inline-flex items-center rounded-sm transition-colors hover:text-foreground pointer-coarse:min-h-11">
              Guides
            </Link>
          </li>
          <li aria-current="page" className="flex min-w-0 items-center gap-1.5 text-subtle">
            <ChevronRight aria-hidden strokeWidth={1.75} className="size-3.5 shrink-0" />
            <span className="truncate">{guide.title}</span>
          </li>
        </ol>
      </nav>

      <GuideProgressProvider
        guideId={guide.id}
        guideSlug={guide.slug}
        stepIds={stepIds}
        signedIn={viewer !== null}
        initialDone={initialDone}
      >
        <header className="mt-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <h1 className="min-w-0 text-display font-semibold tracking-[-0.025em] break-words">
              {guide.title}
            </h1>
            <Suspense fallback={null}>
              <EditLink guideId={guide.id} />
            </Suspense>
          </div>
          {guide.summary && <p className="max-w-2xl text-body text-muted">{guide.summary}</p>}
        </header>

        <div className="sticky top-14 z-10 -mx-4 mt-6 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-xl sm:border sm:bg-surface/85 sm:px-5">
          <GuideProgressSummary />
        </div>

        {guide.steps.length === 0 ? (
          <p className="mt-10 text-body text-muted">This guide has no steps yet.</p>
        ) : (
          <ol className="mt-10 flex flex-col">
            {guide.steps.map((step, index) => (
              <StepItem key={step.id} step={step} number={index + 1} />
            ))}
          </ol>
        )}
      </GuideProgressProvider>
    </article>
  );
}

function StepItem({ step, number }: { step: GuideStep; number: number }) {
  const titleId = `step-${number}-title`;
  return (
    <li
      id={`step-${number}`}
      aria-labelledby={titleId}
      className="animate-fade-up group relative flex scroll-mt-40 gap-4 pb-10 last:pb-0"
      style={stagger(number - 1)}
    >
      <span aria-hidden className="absolute bottom-0 left-[11.5px] top-9 w-px bg-border group-last:hidden" />
      <StepCheckbox stepId={step.id} number={number} title={step.title} />
      <div className="min-w-0 flex-1">
        <StepTitle stepId={step.id} id={titleId}>
          {step.title}
        </StepTitle>
        {step.body && (
          <div className="mt-3">
            <Markdown>{step.body}</Markdown>
          </div>
        )}
        {step.thread && <LinkedThread thread={step.thread} />}
      </div>
    </li>
  );
}

function LinkedThread({ thread }: { thread: NonNullable<GuideStep["thread"]> }) {
  const answered = thread.best_comment_id !== null;
  return (
    <Link
      href={`/t/${thread.slug}`}
      className={cardClasses({ interactive: true, padding: "none", className: "mt-4 flex items-center gap-3 px-4 py-3" })}
    >
      <MessageSquare aria-hidden strokeWidth={1.75} className="size-4 shrink-0 text-muted" />
      <span className="min-w-0 flex-1">
        <span className="block text-meta text-subtle">Related thread</span>
        <span className="block truncate text-body font-medium text-foreground">{thread.title}</span>
      </span>
      {answered && (
        <Badge variant="accent">
          <CircleCheck aria-hidden strokeWidth={1.75} />
          Answered
        </Badge>
      )}
    </Link>
  );
}

async function EditLink({ guideId }: { guideId: GuideDetail["id"] }) {
  const viewer = await getEffectiveViewer();
  if (!viewer || !isModerator(viewer.role)) return null;
  return (
    <Link href={`/mod/guides/${guideId}`} className={buttonClasses({ variant: "secondary", size: "sm" })}>
      <Pencil aria-hidden strokeWidth={1.75} />
      Edit
    </Link>
  );
}

function GuideSkeleton() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col">
      <span className="sr-only">Loading guide…</span>
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="mt-5 h-9 w-3/4" />
      <Skeleton className="mt-3 h-4 w-2/3" />
      <Skeleton className="mt-6 h-16 w-full rounded-xl" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="mt-10 flex gap-4">
          <Skeleton className="size-6 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
