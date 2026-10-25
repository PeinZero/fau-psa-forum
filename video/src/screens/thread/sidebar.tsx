import { ArrowRight, ListChecks, MessageSquare, PenLine } from "lucide-react";
import type { ReactNode } from "react";

import { buttonClasses } from "../../ui/button";
import { CategoryGlyph } from "../../ui/category-glyph";
import { cn } from "../../ui/cn";
import { type DemoThread, guides as demoGuides, starterThreads } from "../demo-data";

/*
 * Sidebar pieces from src/components/sidebar/ at their desktop sizes.
 */

const card = "rounded-xl bg-surface px-5 py-4";
const cardHeading = "text-body font-semibold text-foreground";
const cardRow = "group -mx-2 flex min-h-11 items-center gap-3 rounded-lg px-2 py-2";

const countLabel = (n: number, singular: string) => `${n} ${n === 1 ? singular : `${singular}s`}`;

/**
 * Feed beside a 19rem sidebar (the site's `FeedLayout` from lg up). `wide` is the xl gap (56px);
 * windows narrower than 1280 CSS px use the 40px lg gap. Without a sidebar the feed takes the row.
 */
export function FeedLayout({
  children,
  sidebar,
  wide = true,
  className,
}: {
  children: ReactNode;
  sidebar?: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  if (!sidebar) return <div className={cn("min-w-0", className)}>{children}</div>;
  return (
    <div className={cn("grid grid-cols-[minmax(0,1fr)_19rem]", wide ? "gap-14" : "gap-10", className)}>
      <div className="min-w-0">{children}</div>
      <aside data-anchor="sidebar" className="flex min-w-0 flex-col gap-4">
        {sidebar}
      </aside>
    </div>
  );
}

/**
 * The last group of sidebar cards stays in view under the header while the page scrolls (sticky at
 * 80px on the site). Pages pass `shift`, how far the group has moved down from its place in the flow.
 */
export function SidebarSticky({ children, shift = 0 }: { children: ReactNode; shift?: number }) {
  return (
    <div
      data-anchor="sidebar-sticky"
      className="flex flex-col gap-4"
      style={shift ? { transform: `translateY(${shift}px)` } : undefined}
    >
      {children}
    </div>
  );
}

export function RowIcon({ active = false, className, children }: { active?: boolean; className?: string; children: ReactNode }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-md",
        active ? "bg-accent-soft text-accent" : "bg-raised text-muted",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SidebarCard({
  title,
  seeAll = false,
  children,
  className,
}: {
  title: ReactNode;
  /** Shows the "See all →" link. */
  seeAll?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(card, className)}>
      <div className="mb-2 flex min-h-7 items-center justify-between gap-3">
        <h2 className={cardHeading}>{title}</h2>
        {seeAll && (
          <span className="-mr-2 inline-flex min-h-7 items-center gap-1 rounded-md px-2 text-meta font-medium text-muted">
            See all
            <ArrowRight aria-hidden strokeWidth={1.75} className="size-3.5" />
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

/** A category (or the forum) in a sentence, with the Ask button. */
export function AboutCard({
  title = "PSA FAU Community",
  description = "Questions and answers for Pakistani students in Erlangen & Nuremberg, curated by moderators.",
  icon,
  meta,
  askHover = false,
  className,
}: {
  title?: string;
  description?: ReactNode;
  icon?: ReactNode;
  meta?: ReactNode;
  /** Ask button in its hover look. */
  askHover?: boolean;
  className?: string;
}) {
  return (
    <section className={cn(card, className)}>
      <h2 className={cn(cardHeading, "flex min-h-7 items-center gap-3")}>
        {icon}
        <span className="min-w-0 break-words">{title}</span>
      </h2>
      {description && <p className="mt-2 text-meta text-muted">{description}</p>}
      {meta && <p className="mt-2 text-meta text-muted tabular-nums">{meta}</p>}
      <span className={buttonClasses({ hover: askHover, className: "mt-4 w-full" })}>
        <PenLine strokeWidth={1.75} />
        Ask a question
      </span>
    </section>
  );
}

/** "Guides for newcomers" with step counts; members with progress see "3 of 8 steps done". */
export function GuidesCard({ done }: { done?: (number | null)[] }) {
  return (
    <SidebarCard title="Guides for newcomers" seeAll>
      <ul className="flex flex-col">
        {demoGuides.map((guide, i) => {
          const doneCount = done?.[i] ?? null;
          return (
            <li key={guide.slug}>
              <span className={cardRow}>
                <RowIcon>
                  <ListChecks strokeWidth={1.75} className="size-4" />
                </RowIcon>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-medium text-foreground">{guide.title}</span>
                  <span className="block text-meta text-muted tabular-nums">
                    {doneCount !== null
                      ? `${doneCount} of ${countLabel(guide.stepCount, "step")} done`
                      : countLabel(guide.stepCount, "step")}
                  </span>
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </SidebarCard>
  );
}

/** "More in <category>": the category's other threads, hottest first. */
export function RelatedThreadsCard({ thread, limit = 5 }: { thread: DemoThread; limit?: number }) {
  const related = starterThreads
    .filter((t) => t.category.slug === thread.category.slug && t.id !== thread.id)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  if (related.length === 0) return null;
  return (
    <SidebarCard title={`More in ${thread.category.name}`}>
      <ul className="flex flex-col">
        {related.map((t) => (
          <li key={t.id}>
            <span className="-mx-2 block rounded-lg px-2 py-2">
              <span className="line-clamp-2 text-body font-medium break-words text-foreground">{t.title}</span>
              {t.commentCount > 0 && (
                <span className="mt-0.5 flex items-center gap-1.5 text-meta text-muted tabular-nums">
                  <MessageSquare aria-hidden strokeWidth={1.75} className="size-3.5 text-subtle" />
                  {countLabel(t.commentCount, "comment")}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </SidebarCard>
  );
}

/** The thread page's sidebar: its category with Ask, then more in the category and the guides. */
export function ThreadSidebar({
  thread,
  guidesDone,
  stickyShift = 0,
}: {
  thread: DemoThread;
  guidesDone?: (number | null)[];
  /** See `SidebarSticky`. */
  stickyShift?: number;
}) {
  const category = thread.category;
  return (
    <>
      <AboutCard
        title={category.name}
        icon={
          <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
            <CategoryGlyph slug={category.slug} />
          </span>
        }
        description={category.description}
        meta={
          <span className="rounded-sm font-medium text-accent">
            {countLabel(category.threadCount, "thread")} in {category.name}
          </span>
        }
      />
      <SidebarSticky shift={stickyShift}>
        <RelatedThreadsCard thread={thread} />
        <GuidesCard done={guidesDone} />
      </SidebarSticky>
    </>
  );
}
