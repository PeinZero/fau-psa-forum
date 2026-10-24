import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import UserMenu from "@/components/auth/user-menu";
import { HeaderSearch } from "@/components/layout/header-search";
import { MobileNav, MobileNavDrawer } from "@/components/layout/mobile-nav";
import { NavLinkList, NavLinks } from "@/components/layout/nav-links";
import { ShortcutsDialog } from "@/components/shortcuts/shortcuts-dialog";
import { LogoMark } from "@/components/layout/logo-mark";
import { NotificationBellSlot } from "@/components/notifications/bell-slot";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { buttonClasses } from "@/components/ui/button";
import { getViewer, isModerator } from "@/lib/auth/viewer";

async function ViewerHeaderSearch() {
  const viewer = await getViewer();
  return <HeaderSearch canModerate={viewer !== null && isModerator(viewer.role)} />;
}

export function SiteHeader() {
  return (
    <header
      className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur-xl backdrop-saturate-150"
      style={{ viewTransitionName: "site-header" }}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-accent-foreground"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-1 px-4 sm:px-6">
        <Suspense fallback={<MobileNavDrawer pathname={null} />}>
          <MobileNav />
        </Suspense>
        <Link
          href="/"
          className="-ml-1 mr-2 inline-flex min-h-11 items-center justify-center gap-2.5 pointer-coarse:min-w-11 rounded-md px-1 text-sm font-semibold tracking-tight text-foreground"
        >
          <LogoMark />
          <span className="max-[399px]:sr-only">PSA FAU Community Forum</span>
        </Link>
        <Suspense fallback={<NavLinkList pathname={null} />}>
          <NavLinks />
        </Suspense>
        <div className="ml-auto flex items-center gap-1 max-[399px]:pointer-coarse:[&>a:not([href='/login'])]:size-10! max-[399px]:pointer-coarse:[&>button]:size-10!">
          <Suspense fallback={<HeaderSearch canModerate={false} />}>
            <ViewerHeaderSearch />
          </Suspense>
          <Link
            href="/new"
            aria-label="New thread"
            title="New thread"
            className={buttonClasses({ variant: "ghost", size: "icon" })}
          >
            <Plus strokeWidth={1.75} />
          </Link>
          <ThemeToggle className="max-lg:hidden" />
          <Suspense fallback={null}>
            <NotificationBellSlot />
          </Suspense>
          <Suspense fallback={<div aria-hidden className="skeleton mx-2 size-7 rounded-full" />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
      <ShortcutsDialog />
    </header>
  );
}
