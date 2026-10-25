"use client";

import {
  FileClock,
  FilePenLine,
  Flag,
  FolderTree,
  Hourglass,
  LayoutDashboard,
  ListChecks,
  MessageSquareQuote,
  Megaphone,
  ScrollText,
  UserCheck,
  UserPlus,
  Users,
  MessageSquareText,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";

const icons = {
  feedback: MessageSquareText,
  overview: LayoutDashboard,
  threads: Hourglass,
  reports: Flag,
  edits: FilePenLine,
  updates: FileClock,
  signups: UserPlus,
  applications: UserCheck,
  announcements: Megaphone,
  guides: ListChecks,
  categories: FolderTree,
  users: Users,
  replies: MessageSquareQuote,
  log: ScrollText,
} satisfies Record<string, LucideIcon>;

export type ModNavItem = {
  href: string;
  label: string;
  icon: keyof typeof icons;
  count?: number;
  /** Starts a new group: extra space above it in the sidebar. */
  groupStart?: boolean;
};

export function ModNav({ items }: { items: ModNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Moderation sections" className="lg:sticky lg:top-20 lg:self-start">
      <ul className="-mx-4 flex gap-1 overflow-x-auto overscroll-x-contain border-b border-border px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:overflow-visible lg:border-b-0 lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const current = item.href === "/mod" ? pathname === "/mod" : pathname.startsWith(item.href);
          const Icon = icons[item.icon];
          return (
            <li key={item.href} className={cn("shrink-0", item.groupStart && "lg:mt-4")}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-md px-3 text-small font-medium transition-colors duration-150 ease-out active:bg-surface-hover lg:min-h-9 lg:pointer-coarse:min-h-11",
                  current ? "bg-surface-hover text-foreground" : "text-muted hover:bg-surface-hover hover:text-foreground",
                )}
              >
                <Icon aria-hidden strokeWidth={1.75} className={cn("size-4 shrink-0", current && "text-accent")} />
                <span className="whitespace-nowrap lg:flex-1">{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <Badge variant={current ? "accent" : "neutral"} className="tabular-nums">
                    {item.count}
                    <span className="sr-only"> waiting</span>
                  </Badge>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
