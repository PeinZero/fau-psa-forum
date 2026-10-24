"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";

import { UnseenAnnouncementsBadge } from "@/components/announcements/unseen-badge";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";

import { navItems } from "./nav-links";

/**
 * Below lg the main links live in a drawer. A modal <dialog> keeps focus inside, closes on Esc
 * and makes the page behind it inert.
 */
export function MobileNavDrawer({ pathname }: { pathname: string | null }) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-haspopup="dialog"
        onClick={() => ref.current?.showModal()}
        className={buttonClasses({ variant: "ghost", size: "icon", className: "-ml-2 lg:hidden" })}
      >
        <Menu strokeWidth={1.75} />
      </button>
      <dialog
        ref={ref}
        aria-label="Menu"
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className={cn(
          "fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[min(20rem,calc(100vw-3rem))] max-w-none border-r border-border bg-background p-0 text-foreground not-open:hidden dark:bg-surface",
          "shadow-[24px_0_64px_-12px_rgb(0_0_0/0.35)] transition-[translate,display,overlay] transition-discrete duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] starting:open:-translate-x-full",
          "backdrop:bg-black/30 backdrop:backdrop-blur-[3px] dark:backdrop:bg-black/60",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 items-center justify-between border-b border-border pl-4 pr-2">
            <p className="text-sm font-semibold tracking-tight">PSA Forum</p>
            <button
              type="button"
              aria-label="Close menu"
              onClick={close}
              className={buttonClasses({ variant: "ghost", size: "icon" })}
            >
              <X strokeWidth={1.75} />
            </button>
          </div>
          <nav aria-label="Main" className="flex-1 overflow-y-auto p-2">
            <ul className="flex flex-col gap-0.5">
              {navItems.map(({ href, label, matches }) => {
                const active = pathname !== null && matches(pathname);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={close}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-colors duration-150",
                        active
                          ? "bg-surface-hover text-foreground"
                          : "text-muted hover:bg-surface-hover hover:text-foreground",
                      )}
                    >
                      {label}
                      {href === "/announcements" && (
                        <span className="relative ml-2 mt-2 inline-flex size-4">
                          <UnseenAnnouncementsBadge />
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="flex items-center justify-between border-t border-border py-2 pl-4 pr-2 text-sm text-muted">
            Theme
            <ThemeToggle />
          </div>
        </div>
      </dialog>
    </>
  );
}

/** Reading the URL suspends on routes with unknown params, so render inside <Suspense>. */
export function MobileNav() {
  return <MobileNavDrawer pathname={usePathname()} />;
}
