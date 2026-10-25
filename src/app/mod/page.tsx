import {
  ArrowUpRight,
  CheckCircle2,
  FileClock,
  FilePenLine,
  Flag,
  FolderTree,
  Hourglass,
  Megaphone,
  MessageSquareText,
  UserCheck,
} from "lucide-react";
import Link from "next/link";

import { getModCounts } from "@/components/mod/counts";
import { cardClasses } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { stagger } from "@/components/ui/motion";

const queues = [
  { key: "threads", href: "/mod/threads", title: "Pending threads", text: "Waiting for approval", Icon: Hourglass },
  { key: "reports", href: "/mod/reports", title: "Open reports", text: "Flagged by members", Icon: Flag },
  { key: "updates", href: "/mod/updates", title: "Update requests", text: "Threads that may be out of date", Icon: FileClock },
  { key: "edits", href: "/mod/edits", title: "Recent edits", text: "Edits waiting for review", Icon: FilePenLine },
  { key: "applications", href: "/mod/applications", title: "Applications", text: "People who want to moderate", Icon: UserCheck },
  { key: "feedback", href: "/mod/feedback", title: "Feedback", text: "Messages from members", Icon: MessageSquareText },
] as const;

const tools = [
  { href: "/mod/announcements", title: "Announcements", text: "Post news to every member", Icon: Megaphone },
  { href: "/mod/categories", title: "Categories", text: "Name and order the topics", Icon: FolderTree },
] as const;

export default async function ModOverviewPage() {
  const counts = await getModCounts();
  const waiting = queues.reduce((sum, queue) => sum + counts[queue.key], 0);

  return (
    <div className="grid gap-8">
      <section aria-labelledby="queues-heading" className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="queues-heading" className="text-heading font-semibold tracking-tight">
            Needs attention
          </h2>
          <p className="flex items-center gap-1.5 text-meta text-muted">
            {waiting === 0 && <CheckCircle2 aria-hidden strokeWidth={1.75} className="size-4 text-accent" />}
            {waiting === 0 ? "All caught up. Nothing is waiting." : <span className="tabular-nums">{waiting} waiting in total</span>}
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {queues.map(({ key, href, title, text, Icon }, index) => {
            const count = counts[key];
            return (
              <li key={href} style={stagger(index)} className="animate-fade-up">
                <Link href={href} className={cardClasses({ interactive: true, className: "group flex h-full min-h-11 flex-col gap-2" })}>
                  <span className="flex items-center justify-between text-muted">
                    <span className="flex items-center gap-2 text-meta font-medium">
                      <Icon aria-hidden strokeWidth={1.75} className="size-4" />
                      {title}
                    </span>
                    <ArrowUpRight
                      aria-hidden
                      strokeWidth={1.75}
                      className="size-4 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                    />
                  </span>
                  <span
                    className={cn(
                      "text-display font-semibold leading-none tracking-tight tabular-nums",
                      count > 0 ? "text-foreground" : "text-subtle",
                    )}
                  >
                    {count}
                  </span>
                  <span className="text-meta text-muted">{count > 0 ? text : "Nothing waiting"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="tools-heading" className="grid gap-3">
        <h2 id="tools-heading" className="text-heading font-semibold tracking-tight">
          Manage
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {tools.map(({ href, title, text, Icon }, index) => (
            <li key={href} style={stagger(queues.length + index)} className="animate-fade-up">
              <Link href={href} className={cardClasses({ interactive: true, className: "flex min-h-11 items-center gap-3" })}>
                <Icon aria-hidden strokeWidth={1.75} className="size-4 shrink-0 text-muted" />
                <span className="min-w-0">
                  <span className="block text-small font-medium text-foreground">{title}</span>
                  <span className="block text-meta text-muted">{text}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
