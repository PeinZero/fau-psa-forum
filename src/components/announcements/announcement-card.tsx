import { Pin } from "lucide-react";

import { Author } from "@/components/author";
import { Markdown } from "@/components/markdown";
import { Badge } from "@/components/ui/badge";
import { cardClasses } from "@/components/ui/card";
import { formatDate } from "@/lib/labels";

import type { Announcement } from "./data";

export function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  const { id, title, body, is_pinned, created_at, updated_at, author } = announcement;
  const edited = updated_at !== created_at;

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
        <h2 id={`announcement-${id}-title`} className="break-words text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h2>
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
      {body.trim() && (
        <div className="mt-4">
          <Markdown>{body}</Markdown>
        </div>
      )}
    </article>
  );
}
