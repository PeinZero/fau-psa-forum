import { ArrowUpRight, FilePenLine, Flag, Hourglass, UserCheck } from "lucide-react";
import Link from "next/link";

import { getModCounts } from "@/components/mod/counts";
import { cardClasses } from "@/components/ui/card";
import { stagger } from "@/components/ui/motion";

export default async function ModOverviewPage() {
  const counts = await getModCounts();
  const sections = [
    { href: "/mod/threads", title: "Pending threads", text: "Waiting for approval", count: counts.threads, Icon: Hourglass },
    { href: "/mod/reports", title: "Open reports", text: "Flagged by members", count: counts.reports, Icon: Flag },
    { href: "/mod/edits", title: "Recent edits", text: "Changed in the last 7 days", count: counts.edits, Icon: FilePenLine },
    { href: "/mod/applications", title: "Applications", text: "People who want to moderate", count: counts.applications, Icon: UserCheck },
  ];

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {sections.map(({ href, title, text, count, Icon }, index) => (
        <li key={href} style={stagger(index)} className="animate-fade-up">
          <Link href={href} className={cardClasses({ interactive: true, className: "group flex min-h-11 flex-col gap-3" })}>
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
            <span className={`text-3xl font-semibold tracking-tight ${count > 0 ? "text-foreground" : "text-subtle"}`}>{count}</span>
            <span className="text-meta text-muted">{text}</span>
          </Link>
        </li>
      ))}
      <li style={stagger(sections.length)} className="animate-fade-up sm:col-span-2">
        <Link href="/mod/categories" className={cardClasses({ interactive: true, className: "min-h-11 text-meta font-medium" })}>
          Manage categories
        </Link>
      </li>
    </ul>
  );
}
