import { ArrowRight, Pin } from "lucide-react";
import Link from "next/link";

import { Author } from "@/components/author";
import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { cardClasses } from "@/components/ui/card";
import { formatDate } from "@/lib/labels";

import type { Announcement } from "./data";
import { announcementHref } from "./data";
import { announcementExcerpt } from "./excerpt";

export function AnnouncementCard({
  announcement,
  variant = "full",
}: {
  announcement: Announcement;
  variant?: "excerpt" | "full";
}) {
  const { id, title, body, is_pinned, created_at, updated_at, author } = announcement;
  const edited = updated_at !== created_at;
  // On its own page the announcement is the page heading.
  const Heading = variant === "full" ? "h1" : "h2";

  return (
    <article
      id={`announcement-${id}`}
      aria-labelledby={`announcement-${id}-title`}
      className={cardClasses({ className: "scroll-mt-20" })}
    >
      <header className="flex flex-col gap-2">
        {is_pinned && (
          <Badge variant="accent" className="self-start">
            <Pin aria-hidden strokeWidth={1.75} />
            Pinned
          </Badge>
        )}
        <Heading
          id={`announcement-${id}-title`}
          className={
            variant === "full"
              ? "break-words text-2xl font-semibold tracking-tight text-foreground"
              : "break-words text-lg font-semibold tracking-tight text-foreground"
          }
        >
          {variant === "excerpt" ? (
            <Link href={announcementHref(id)} className="rounded-sm transition-colors hover:text-accent">
              {title}
            </Link>
          ) : (
            title
          )}
        </Heading>
        <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-meta text-muted">
          <Author profile={author} />
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <span aria-hidden className="text-subtle">
              ·
            </span>
            <time dateTime={created_at}>{formatDate(created_at)}</time>
          </span>
          {edited && (
            <span className="text-subtle">
              edited <time dateTime={updated_at}>{formatDate(updated_at)}</time>
            </span>
          )}
        </p>
      </header>
      {body.trim() &&
        (variant === "excerpt" ? (
          <>
            <p className="mt-4 break-words text-sm text-muted">{announcementExcerpt(body)}</p>
            <Link
              href={announcementHref(id)}
              className="mt-3 inline-flex min-h-9 items-center gap-1 rounded-md text-sm font-medium text-accent transition-colors hover:underline pointer-coarse:min-h-11"
            >
              Read more
              <span className="sr-only">: {title}</span>
              <ArrowRight aria-hidden strokeWidth={1.75} className="size-3.5" />
            </Link>
          </>
        ) : (
          <div className="mt-4">
            <Markdown>{body}</Markdown>
          </div>
        ))}
    </article>
  );
}
