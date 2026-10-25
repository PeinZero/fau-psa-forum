import {
  CheckCircle2,
  FileClock,
  FilePenLine,
  Hourglass,
  LayoutDashboard,
  type LucideIcon,
  Megaphone,
  MessageSquare,
  UserCheck,
} from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { AuthorName } from "../../ui/avatar";
import { Badge, StatusPill } from "../../ui/badge";
import { buttonClasses } from "../../ui/button";
import { cardClasses } from "../../ui/card";
import { CategoryGlyph } from "../../ui/category-glyph";
import { cn } from "../../ui/cn";
import { cityLabels, type DemoThread } from "../demo-data";

/*
 * The pending-threads queue as a moderator sees it below the sm breakpoint (src/components/mod/mod-gate.tsx,
 * mod-nav.tsx, src/app/mod/threads/page.tsx): the section strip with the pending count, then the queue.
 * The film shows only approving and curating, so the strip leaves out the report, sign-up and user
 * sections, and the queue card keeps only Approve.
 */

type NavItem = { label: string; Icon: LucideIcon; current?: boolean; count?: ReactNode; countOpacity?: number };

/** The moderation sections as a horizontal strip; it runs out of the window at the right like the site's scroller. */
function ModNavStrip({ pendingCount, pendingCountOpacity }: { pendingCount: ReactNode; pendingCountOpacity: number }) {
  const items: NavItem[] = [
    { label: "Overview", Icon: LayoutDashboard },
    { label: "Pending threads", Icon: Hourglass, current: true, count: pendingCount, countOpacity: pendingCountOpacity },
    { label: "Update requests", Icon: FileClock },
    { label: "Recent edits", Icon: FilePenLine },
    { label: "Applications", Icon: UserCheck },
    { label: "Announcements", Icon: Megaphone },
  ];
  return (
    <nav aria-label="Moderation sections">
      <ul className="-mx-4 flex gap-1 overflow-hidden border-b border-border px-4 pb-2">
        {items.map(({ label, Icon, current, count, countOpacity = 1 }) => (
          <li key={label} className="shrink-0">
            <span
              className={cn(
                "flex min-h-11 items-center gap-2 rounded-md px-3 text-small font-medium",
                current ? "bg-surface-hover text-foreground" : "text-muted",
              )}
            >
              <Icon aria-hidden strokeWidth={1.75} className={cn("size-4 shrink-0", current && "text-accent")} />
              <span className="whitespace-nowrap">{label}</span>
              {count !== undefined && countOpacity > 0.001 && (
                <Badge
                  variant={current ? "accent" : "neutral"}
                  className="tabular-nums"
                  style={{ opacity: countOpacity, transform: countOpacity < 1 ? `scale(${0.85 + 0.15 * countOpacity})` : undefined }}
                >
                  {count}
                </Badge>
              )}
            </span>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * The strip and the queue column, cropped from the moderation page: the page header above the strip
 * stays out of frame. Fills its window from the top with the page's 16px gutter on both sides.
 */
export function ModQueue({
  pendingCount,
  pendingCountOpacity = 1,
  children,
}: {
  /** Count on the "Pending threads" section (a node allows rolling digits). */
  pendingCount: ReactNode;
  /** The site hides the badge at zero; this fades it. */
  pendingCountOpacity?: number;
  children: ReactNode;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-background px-4 pt-3">
      <ModNavStrip pendingCount={pendingCount} pendingCountOpacity={pendingCountOpacity} />
      <div className="relative mt-6 min-w-0">{children}</div>
    </div>
  );
}

/** What the queue shows once every thread has been reviewed (EmptyState). */
export function QueueEmpty({ style }: { style?: CSSProperties }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-surface px-6 py-12 text-center" style={style}>
      <div
        aria-hidden
        className="mb-4 flex size-10 items-center justify-center rounded-full bg-raised text-subtle shadow-[0_1px_2px_var(--shadow-color)] [&_svg]:size-5"
      >
        <CheckCircle2 strokeWidth={1.75} />
      </div>
      <p className="text-body font-semibold text-foreground">All caught up</p>
      <div className="mt-1 max-w-sm text-meta text-pretty text-muted">Every thread has been reviewed. New questions show up here.</div>
    </div>
  );
}

/** An existing published thread that may already answer the pending one (duplicates/thread-row.tsx). */
function SimilarThreadRow({ thread }: { thread: DemoThread }) {
  return (
    <div className="min-w-0">
      <span className="break-words text-body font-medium text-foreground">{thread.title}</span>
      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted">
        <span className="inline-flex items-center gap-1.5">
          <CategoryGlyph slug={thread.category.slug} className="size-3.5 text-subtle" />
          {thread.category.name}
        </span>
        {thread.city ? <span>{cityLabels[thread.city]}</span> : null}
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <MessageSquare aria-hidden strokeWidth={1.75} className="size-3.5 text-subtle" />
          {thread.commentCount} {thread.commentCount === 1 ? "comment" : "comments"}
        </span>
        {thread.bestCommentId !== null ? <StatusPill kind="answered" /> : null}
      </p>
    </div>
  );
}

/**
 * One pending thread in the queue: title, author and facts, the collapsed text, the possible
 * duplicates the site finds for its title, and Approve.
 */
export function PendingThreadCard({
  thread,
  duplicate,
  duplicateReveal = 1,
  duplicateHighlight = 0,
  approveHover = false,
  approvePressed = false,
  approving = false,
  style,
}: {
  thread: DemoThread;
  duplicate: DemoThread;
  /** 0 → 1 the duplicates box opens inside the card. */
  duplicateReveal?: number;
  /** A soft emerald ring that draws the eye to the hint as it appears (0–1). */
  duplicateHighlight?: number;
  approveHover?: boolean;
  approvePressed?: boolean;
  /** The button's pending label while the action runs. */
  approving?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div className={cardClasses({ className: "grid gap-4" })} style={style}>
      <div className="min-w-0">
        <h2 className="break-words text-title font-semibold tracking-tight text-foreground">{thread.title}</h2>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted">
          <AuthorName avatar name={thread.author.displayName} role={thread.author.role} affiliation={thread.author.affiliation} />
          <Badge>{thread.category.name}</Badge>
          {thread.city && <span>{cityLabels[thread.city]}</span>}
          <span>{thread.date}</span>
        </p>
      </div>
      <div>
        <span className="inline-flex min-h-11 items-center text-meta font-medium text-muted">Show text</span>
      </div>
      <div
        data-bs-anchor="duplicates"
        className="grid"
        style={{
          gridTemplateRows: `minmax(0, ${duplicateReveal}fr)`,
          marginTop: (duplicateReveal - 1) * 16,
          opacity: Math.min(1, duplicateReveal * 1.4 - 0.2),
        }}
      >
        <div className="min-h-0 overflow-hidden">
          <section
            aria-label="Possible duplicates"
            className="rounded-lg border border-border bg-background p-3"
            style={
              duplicateHighlight > 0
                ? {
                    borderColor: `color-mix(in oklab, var(--accent) ${Math.round(45 * duplicateHighlight)}%, var(--border))`,
                    boxShadow: `0 0 0 3px rgb(16 185 129 / ${0.12 * duplicateHighlight})`,
                  }
                : undefined
            }
          >
            <h3 className="text-meta font-medium text-muted">Possible duplicates</h3>
            <ul className="mt-2 grid gap-3">
              <li className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1 basis-56">
                  <SimilarThreadRow thread={duplicate} />
                </div>
              </li>
            </ul>
          </section>
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-2 border-t border-border pt-4">
        <span data-bs-anchor="approve" className={buttonClasses({ variant: "primary", size: "sm", hover: approveHover, pressed: approvePressed })}>
          {approving ? "Approving…" : "Approve"}
        </span>
      </div>
    </div>
  );
}
