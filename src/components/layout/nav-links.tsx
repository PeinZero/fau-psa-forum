"use client";

import { Megaphone } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UnseenAnnouncementsBadge } from "@/components/announcements/unseen-badge";
import { useUnseenAnnouncements } from "@/components/announcements/unseen-store";
import { cn } from "@/components/ui/cn";

// "About" waits for lg: at md the bar only has room for three labels beside the search field.
const links = [
  { href: "/", label: "Browse", matches: (path: string) => path === "/" || path.startsWith("/c/") },
  { href: "/guides", label: "Guides", matches: (path: string) => path === "/guides" || path.startsWith("/guides/") },
  { href: "/new", label: "New thread", matches: (path: string) => path === "/new" },
  { href: "/about", label: "About", matches: (path: string) => path === "/about", wide: true },
];

export function NavLinkList({ pathname }: { pathname: string | null }) {
  const unseen = useUnseenAnnouncements();
  return (
    <nav aria-label="Main" className="hidden items-center gap-0.5 md:flex">
      {links.map(({ href, label, matches, wide }) => {
        const active = pathname !== null && matches(pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "min-h-8 items-center whitespace-nowrap rounded-md px-2.5 text-meta font-medium transition-colors duration-150",
              wide ? "hidden lg:inline-flex" : "inline-flex",
              active ? "bg-surface-hover text-foreground" : "text-muted hover:bg-surface-hover hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
      {/* Icon only: a text label does not fit beside the search field and moderator controls. */}
      <Link
        href="/announcements"
        aria-label={unseen ? `Announcements, ${unseen} unread` : "Announcements"}
        title="Announcements"
        aria-current={pathname === "/announcements" ? "page" : undefined}
        className={cn(
          "relative hidden size-8 items-center justify-center rounded-md transition-colors duration-150 pointer-coarse:size-11 lg:inline-flex",
          pathname === "/announcements"
            ? "bg-surface-hover text-foreground"
            : "text-muted hover:bg-surface-hover hover:text-foreground",
        )}
      >
        <Megaphone aria-hidden strokeWidth={1.75} className="size-4" />
        <UnseenAnnouncementsBadge />
      </Link>
    </nav>
  );
}

/** Reading the URL suspends on routes with unknown params, so render inside <Suspense>. */
export function NavLinks() {
  return <NavLinkList pathname={usePathname()} />;
}
