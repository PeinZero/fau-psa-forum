import { Pin } from "lucide-react";
import Link from "next/link";

import { Author, Avatar } from "@/components/author";
import { Markdown } from "@/components/markdown";
import { metaFrame, metaItem, metaLine } from "@/components/thread/meta";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import { formatDate } from "@/lib/labels";

import type { Announcement } from "./data";
import { announcementHref } from "./data";
import { announcementExcerpt } from "./excerpt";

function PinnedBadge({ className }: { className?: string }) {
  return (
    <Badge variant="accent" className={className}>
      <Pin aria-hidden strokeWidth={1.75} />
      Pinned
    </Badge>
  );
}

/**
 * `excerpt` is a calm card for the list (the whole card opens the announcement); `full` is the
 * announcement's own page, laid out like a thread: heading, byline, then the reading column.
 */
export function AnnouncementCard({
  announcement,
  variant = "full",
}: {
  announcement: Announcement;
  variant?: "excerpt" | "full";
}) {
  return variant === "excerpt" ? <AnnouncementExcerpt announcement={announcement} /> : <AnnouncementArticle announcement={announcement} />;
}

function AnnouncementExcerpt({ announcement }: { announcement: Announcement }) {
  const { id, title, body, is_pinned, created_at, author } = announcement;
  const excerpt = body.trim() ? announcementExcerpt(body) : "";
  return (
    <article
      id={`announcement-${id}`}
      aria-labelledby={`announcement-${id}-title`}
      className={cn(
        "group relative scroll-mt-20 rounded-xl bg-surface px-4 py-4 transition-colors duration-150 ease-out hover:bg-surface-hover sm:px-5",
        "has-[.row-link:focus-visible]:outline-2 has-[.row-link:focus-visible]:outline-offset-2 has-[.row-link:focus-visible]:outline-ring",
      )}
    >
      <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted">
        {is_pinned && <PinnedBadge />}
        <time dateTime={created_at} className="whitespace-nowrap tabular-nums">
          {formatDate(created_at)}
        </time>
        <span aria-hidden className="text-subtle">
          ·
        </span>
        <span className="min-w-0 truncate" title={author?.display_name ?? "Deleted user"}>
          {author?.display_name ?? "Deleted user"}
        </span>
      </p>
      <h2 id={`announcement-${id}-title`} className="mt-2 text-title font-semibold text-pretty break-words text-foreground">
        <Link
          href={announcementHref(id)}
          className="row-link rounded-sm after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none"
        >
          {title}
        </Link>
      </h2>
      {excerpt && <p className="mt-1 line-clamp-3 text-small break-words text-muted">{excerpt}</p>}
    </article>
  );
}

function AnnouncementArticle({ announcement }: { announcement: Announcement }) {
  const { id, title, body, is_pinned, created_at, updated_at, author } = announcement;
  const edited = updated_at !== created_at;
  const item = cn(metaItem, "whitespace-nowrap");
  return (
    <article id={`announcement-${id}`} aria-labelledby={`announcement-${id}-title`} className="flex flex-col">
      <header>
        {is_pinned && <PinnedBadge className="mb-3" />}
        <h1
          id={`announcement-${id}-title`}
          className="text-display font-semibold tracking-[-0.02em] text-pretty break-words text-foreground"
        >
          {title}
        </h1>
        <div className="mt-4 flex items-center gap-3">
          <Avatar name={author?.display_name ?? null} className="size-9 text-xs" />
          <div className="min-w-0 text-meta text-muted">
            <Author profile={author} avatar={false} />
            <div className={metaFrame}>
              <p className={cn(metaLine, "tabular-nums")}>
                <span className={item}>
                  <time dateTime={created_at}>{formatDate(created_at)}</time>
                </span>
                {edited && (
                  <span className={item}>
                    edited <time dateTime={updated_at}>{formatDate(updated_at)}</time>
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </header>
      {body.trim() && (
        <div className="mt-6 border-t border-border pt-6 sm:pt-8">
          <Markdown size="reading">{body}</Markdown>
        </div>
      )}
    </article>
  );
}
