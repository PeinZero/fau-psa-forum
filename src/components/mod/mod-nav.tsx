"use client";

import {
  FilePenLine,
  Flag,
  FolderTree,
  Hourglass,
  LayoutDashboard,
  Megaphone,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";

const icons = {
  overview: LayoutDashboard,
  threads: Hourglass,
  reports: Flag,
  edits: FilePenLine,
  applications: UserCheck,
  announcements: Megaphone,
  categories: FolderTree,
  users: Users,
} satisfies Record<string, LucideIcon>;

export type ModNavItem = { href: string; label: string; icon: keyof typeof icons; count?: number };

export function ModNav({ items }: { items: ModNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Moderation sections" className="lg:sticky lg:top-20 lg:self-start">
      <ul className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:border-b-0 lg:px-0 lg:pb-0">
        {items.map((item) => {
          const current = item.href === "/mod" ? pathname === "/mod" : pathname.startsWith(item.href);
          const Icon = icons[item.icon];
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors duration-150 ease-out lg:min-h-9 lg:pointer-coarse:min-h-11",
                  current ? "bg-surface-hover text-foreground" : "text-muted hover:bg-surface-hover hover:text-foreground",
                )}
              >
                <Icon aria-hidden strokeWidth={1.75} className={cn("size-4 shrink-0", current && "text-accent")} />
                <span className="whitespace-nowrap lg:flex-1">{item.label}</span>
                {item.count !== undefined && item.count > 0 && (
                  <Badge variant={current ? "accent" : "neutral"}>
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
