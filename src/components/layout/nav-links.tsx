"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UnseenAnnouncementsBadge } from "@/components/announcements/unseen-badge";
import { cn } from "@/components/ui/cn";
import { LinkPending } from "./link-pending";

export type NavItem = { href: string; label: string; matches: (path: string) => boolean };

const under = (prefix: string) => (path: string) => path === prefix || path.startsWith(`${prefix}/`);

/** Home is the logo; categories live under Browse. */
export const navItems: readonly NavItem[] = [
  { href: "/browse", label: "Browse", matches: (path) => under("/browse")(path) || path.startsWith("/c/") },
  { href: "/guides", label: "Guides", matches: under("/guides") },
  { href: "/announcements", label: "Announcements", matches: under("/announcements") },
  { href: "/about", label: "About", matches: under("/about") },
];

// While another link is loading, the current one lets go of its highlight.
const dimWhilePending =
  "group-has-data-pending/main-nav:bg-transparent group-has-data-pending/main-nav:text-muted";

/** Desktop bar; below lg the same links sit in the menu drawer. */
export function NavLinkList({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Main" className="group/main-nav hidden items-center gap-0.5 lg:flex">
      {navItems.map(({ href, label, matches }) => {
        const active = pathname !== null && matches(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative isolate inline-flex min-h-8 items-center whitespace-nowrap rounded-md px-2.5 text-meta font-medium transition-colors duration-150 pointer-coarse:min-h-11 has-data-pending:text-foreground",
              active
                ? cn("bg-surface-hover text-foreground", dimWhilePending)
                : "text-muted hover:bg-surface-hover hover:text-foreground",
            )}
          >
            {label}
            {href === "/announcements" && <UnseenAnnouncementsBadge />}
            <LinkPending className="bg-surface-hover" />
          </Link>
        );
      })}
    </nav>
  );
}

/** Reading the URL suspends on routes with unknown params, so render inside <Suspense>. */
export function NavLinks() {
  return <NavLinkList pathname={usePathname()} />;
}
