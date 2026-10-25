"use client";

import { Menu, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";

import { UnseenAnnouncementsBadge } from "@/components/announcements/unseen-badge";
import { OPEN_COMMAND_PALETTE } from "@/components/command/command-palette";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";

import { LogoMark } from "./logo-mark";
import { navItems } from "./nav-links";

/**
 * Below lg the main links live in a drawer. A modal <dialog> keeps focus inside, closes on Esc
 * and makes the page behind it inert.
 */
export function MobileNavDrawer({ pathname }: { pathname: string | null }) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => ref.current?.close();
  const openSearch = () => {
    close();
    window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE, { cancelable: true }));
  };

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
          "backdrop:bg-black/30 backdrop:backdrop-blur-[3px] backdrop:transition-opacity backdrop:duration-200 backdrop:ease-out starting:open:backdrop:opacity-0 dark:backdrop:bg-black/60",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border pl-3 pr-2">
            <Link
              href="/"
              onClick={close}
              className="inline-flex min-h-11 items-center gap-2.5 rounded-md px-1 text-sm font-semibold tracking-tight text-foreground transition-opacity duration-150 ease-out hover:opacity-80"
            >
              <LogoMark />
              PSA FAU Community Forum
            </Link>
            <button
              type="button"
              aria-label="Close menu"
              onClick={close}
              className={buttonClasses({ variant: "ghost", size: "icon" })}
            >
              <X strokeWidth={1.75} />
            </button>
          </div>
          <div className="flex flex-col gap-2 px-3 pt-3">
            <Link href="/new" onClick={close} className={buttonClasses({ className: "w-full" })}>
              <Plus strokeWidth={1.75} aria-hidden />
              Ask a question
            </Link>
            <button
              type="button"
              onClick={openSearch}
              className="flex min-h-9 w-full items-center gap-2 rounded-md border border-border bg-surface px-3 text-body text-subtle transition-[background-color,color] duration-150 ease-out hover:bg-surface-hover hover:text-muted active:bg-surface-hover pointer-coarse:min-h-11 dark:bg-raised"
            >
              <Search aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
              Search threads…
            </button>
          </div>
          <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-3">
            <ul className="flex flex-col gap-0.5">
              {navItems.map(({ href, label, icon: Icon, matches }) => {
                const active = pathname !== null && matches(pathname);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={close}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group/item flex min-h-10 items-center gap-3 rounded-md px-3 text-body font-medium transition-colors duration-150 ease-out pointer-coarse:min-h-11",
                        active
                          ? "bg-surface-hover text-foreground"
                          : "text-muted hover:bg-surface-hover hover:text-foreground active:bg-surface-hover",
                      )}
                    >
                      <span className="relative inline-flex">
                        <Icon
                          aria-hidden
                          strokeWidth={1.75}
                          className={cn(
                            "size-4 transition-colors duration-150 ease-out",
                            active ? "text-foreground" : "text-subtle group-hover/item:text-muted",
                          )}
                        />
                        {href === "/announcements" && <UnseenAnnouncementsBadge />}
                      </span>
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="flex shrink-0 items-center justify-between border-t border-border py-2 pl-4 pr-2 text-meta text-muted">
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
