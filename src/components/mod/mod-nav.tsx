"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type ModNavItem = { href: string; label: string; count?: number };

export function ModNav({ items }: { items: ModNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Moderation sections" className="mb-6">
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => {
          const current = item.href === "/mod" ? pathname === "/mod" : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={`inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-medium ${
                  current ? "border-accent bg-accent text-accent-foreground" : "border-border hover:bg-border/40"
                }`}
              >
                {item.label}
                {item.count !== undefined && item.count > 0 && (
                  <span className="rounded-full bg-background px-2 text-xs text-foreground">{item.count}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
