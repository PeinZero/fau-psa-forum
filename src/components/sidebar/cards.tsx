import { ArrowRight, ListChecks, Megaphone, PenLine, Pin } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { announcementHref } from "@/components/announcements/data";
import { fetchGuideSummaries } from "@/components/guides/data";
import { guideHref } from "@/components/guides/guide-card";
import { CategoryGlyph } from "@/components/thread/category-icon";
import { fetchCategoriesWithCounts } from "@/components/thread/thread-list";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Skeleton } from "@/components/ui/skeleton";
import { countLabel, formatDate } from "@/lib/labels";
import { relativeTime } from "@/lib/time";

import { cardClasses as card, cardHeading, cardRow as row, RowIcon } from "./card-styles";
import { fetchLatestAnnouncements } from "./data";

export function SidebarCard({
  title,
  href,
  linkLabel,
  children,
  className,
}: {
  title: ReactNode;
  /** "See all" target; screen readers hear `linkLabel` instead. */
  href?: string;
  linkLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(card, className)}>
      <div className="mb-2 flex min-h-7 items-center justify-between gap-3">
        <h2 className={cardHeading}>{title}</h2>
        {href && (
          <Link
            href={href}
            aria-label={linkLabel}
            className="-mr-2 inline-flex min-h-7 items-center gap-1 rounded-md px-2 text-meta font-medium text-muted transition-colors duration-150 hover:bg-surface-hover hover:text-foreground pointer-coarse:min-h-11"
          >
            See all
            <ArrowRight aria-hidden strokeWidth={1.75} className="size-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/** A category (or the forum) in a sentence, with the one action that matters there. */
export function AboutCard({
  title = "PSA FAU Community",
  description = "Questions and answers for Pakistani students in Erlangen & Nuremberg, curated by moderators.",
  icon,
  meta,
  askHref = "/new",
  className,
}: {
  className?: string;
  title?: string;
  description?: ReactNode;
  icon?: ReactNode;
  meta?: ReactNode;
  askHref?: string;
}) {
  return (
    <section className={cn(card, className)}>
      <h2 className={cn(cardHeading, "flex min-h-7 items-center gap-3")}>
        {icon}
        <span className="min-w-0 break-words">{title}</span>
      </h2>
      {description && <p className="mt-2 text-meta text-muted">{description}</p>}
      {meta && <p className="mt-2 text-meta tabular-nums text-muted">{meta}</p>}
      <Link href={askHref} className={buttonClasses({ className: "mt-4 w-full" })}>
        <PenLine strokeWidth={1.75} />
        Ask a question
      </Link>
    </section>
  );
}

/** Hidden when there are no announcements. */
export async function AnnouncementsCard({ className }: { className?: string }) {
  const { items, fetchedAt } = await fetchLatestAnnouncements();
  if (items.length === 0) return null;
  return (
    <SidebarCard
      title="Announcements"
      href="/announcements"
      linkLabel="See all announcements"
      className={className}
    >
      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={announcementHref(item.id)} className={cn(row, "items-start")}>
              <AnnouncementIcon pinned={item.is_pinned} />
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-body font-medium break-words text-foreground">
                  {item.is_pinned && <span className="sr-only">Pinned: </span>}
                  {item.title}
                </span>
                <time
                  dateTime={item.created_at}
                  title={formatDate(item.created_at)}
                  className="mt-0.5 block text-meta text-muted"
                >
                  {relativeTime(item.created_at, fetchedAt)}
                </time>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </SidebarCard>
  );
}

export function AnnouncementIcon({ pinned }: { pinned: boolean }) {
  const Icon = pinned ? Pin : Megaphone;
  return (
    <RowIcon active={pinned} className="mt-0.5">
      <Icon strokeWidth={1.75} className="size-4" />
    </RowIcon>
  );
}

const GUIDE_LIMIT = 4;

export async function GuidesCard() {
  const { guides } = await fetchGuideSummaries({ limit: GUIDE_LIMIT });
  if (guides.length === 0) return null;
  return (
    <SidebarCard title="Guides for newcomers" href="/guides" linkLabel="See all guides">
      <ul className="flex flex-col">
        {guides.map((guide) => (
          <li key={guide.id}>
            <Link href={guideHref(guide.slug)} className={row}>
              <RowIcon>
                <ListChecks strokeWidth={1.75} className="size-4" />
              </RowIcon>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-medium text-foreground" title={guide.title}>
                  {guide.title}
                </span>
                <span className="block text-meta tabular-nums text-muted">
                  {guide.doneCount !== null && guide.stepCount > 0
                    ? `${guide.doneCount} of ${countLabel(guide.stepCount, "step")} done`
                    : countLabel(guide.stepCount, "step")}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </SidebarCard>
  );
}

export async function CategoriesCard({ currentSlug }: { currentSlug?: string }) {
  const categories = await fetchCategoriesWithCounts();
  return (
    <SidebarCard title="Categories" href="/browse" linkLabel="Browse all threads">
      <ul className="flex flex-col">
        {categories.map((category) => {
          const current = category.slug === currentSlug;
          return (
            <li key={category.id}>
              <Link
                href={`/c/${category.slug}`}
                title={category.description ?? undefined}
                aria-current={current ? "page" : undefined}
                className={cn(row, "min-h-10 py-1.5", current && "bg-surface-hover")}
              >
                <RowIcon active={current}>
                  <CategoryGlyph slug={category.slug} />
                </RowIcon>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-body text-foreground",
                    current ? "font-semibold" : "font-medium",
                  )}
                >
                  {category.name}
                </span>
                <span className="shrink-0 text-meta tabular-nums text-muted">
                  {category.threadCount}
                  <span className="sr-only"> {category.threadCount === 1 ? "thread" : "threads"}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </SidebarCard>
  );
}

const footerLinks = [
  { href: "/about", label: "About" },
  { href: "/contributors", label: "Contributors" },
  { href: "/privacy", label: "Privacy" },
  { href: "/impressum", label: "Impressum" },
];

export function SidebarLinks() {
  return (
    <nav aria-label="About the forum" className="px-1 max-lg:hidden">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-meta text-muted">
        {footerLinks.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="rounded-sm transition-colors duration-150 hover:text-foreground">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Same frame and row count as the card it stands in for, so nothing jumps when data arrives. */
export function SidebarCardSkeleton({
  rows = 3,
  tall = false,
  className,
}: {
  rows?: number;
  tall?: boolean;
  className?: string;
}) {
  return (
    <div role="status" aria-busy="true" className={cn(card, className)}>
      <span className="sr-only">Loading…</span>
      <div className="mb-2 flex min-h-7 items-center">
        <Skeleton className="h-4 w-28" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={cn("flex items-center gap-3 py-2", tall ? "min-h-14" : "min-h-10")}>
          <Skeleton className="size-7 rounded-md" />
          <div className="flex-1">
            <Skeleton className="h-3.5 w-4/5" />
            {tall && <Skeleton className="mt-2 h-3 w-16" />}
          </div>
        </div>
      ))}
    </div>
  );
}
