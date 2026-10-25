import { Bell, Menu, Monitor, Moon, Plus, Search, ShieldCheck, Sun } from "lucide-react";
import type { ReactNode } from "react";

import { AccountAvatar } from "../ui/avatar";
import { buttonClasses } from "../ui/button";
import { cn } from "../ui/cn";
import { Kbd } from "../ui/kbd";
import { LogoMark } from "../ui/logo-mark";
import { AnnouncementBar, ANNOUNCEMENT_BAR_HEIGHT, ANNOUNCEMENT_BAR_HEIGHT_TOUCH } from "./announcement-bar";
import { users } from "./demo-data";

/** Header height in site px: the 56px row plus its 1px hairline. */
export const SITE_HEADER_HEIGHT = 57;

export type NavSection = "browse" | "guides" | "announcements" | "about";
export type ThemeChoice = "system" | "light" | "dark";
/** Header controls a scene can show in their hover look (e.g. under the film's cursor). */
export type HeaderTarget = "search" | "ask" | "theme" | "bell" | "account" | "signin" | "moderation";

export type SiteHeaderProps = {
  /** Signed-in shows the bell and the account avatar; signed-out shows "Sign in". */
  signedIn?: boolean;
  /** Unread notifications on the bell; 0 hides the count. Only shown when signed in. */
  bellCount?: number;
  /** Replaces the bell count's digits, e.g. with rolling digits. */
  bellCountNode?: ReactNode;
  /** Scale of the bell count, for the site's small pop when a notification arrives (1 = rest). */
  bellPop?: number;
  /** Whose initials the account avatar shows. */
  userName?: string;
  /** Moderators get the shield link with the pending count (threads, applications, updates…). */
  moderation?: { pending: number; pendingNode?: ReactNode } | null;
  /** Highlighted nav link. */
  active?: NavSection | null;
  /** Icon of the theme toggle: the stored choice (system shows a monitor). */
  themeChoice?: ThemeChoice;
  /** Pinned announcement bar above the header; null leaves it out. */
  announcement?: { title: string; pinned: boolean } | null;
  /** `phone` is the compact header below 400px wide: menu, logo mark, icon buttons. */
  device?: "desktop" | "phone";
  /** A control in its hover look. */
  hover?: HeaderTarget | null;
  /**
   * Opacity of the header's background. The site blurs what scrolls beneath a 70% background; the
   * film cannot blur inside a 3D window, so pages raise this once content scrolls under the header.
   */
  backgroundOpacity?: number;
};

const navItems: { id: NavSection; label: string }[] = [
  { id: "browse", label: "Browse" },
  { id: "guides", label: "Guides" },
  { id: "announcements", label: "Announcements" },
  { id: "about", label: "About" },
];

const themeIcons = { system: Monitor, light: Sun, dark: Moon } satisfies Record<ThemeChoice, unknown>;

/**
 * The site header (src/components/layout/site-header.tsx and children), optionally under the
 * announcement bar. Colors come from the window's theme tokens, so it works in dark and light.
 */
export function SiteHeader({
  signedIn = false,
  bellCount = 0,
  bellCountNode,
  bellPop = 1,
  userName = users.newStudent.displayName,
  moderation = null,
  active = null,
  themeChoice = "system",
  announcement = null,
  device = "desktop",
  hover = null,
  backgroundOpacity = 0.7,
}: SiteHeaderProps) {
  const phone = device === "phone";
  const ThemeIcon = themeIcons[themeChoice];
  const ghostIcon = (target: HeaderTarget, className?: string) =>
    buttonClasses({ variant: "ghost", size: "icon", hover: hover === target, touch: phone, className });

  return (
    <>
      {announcement ? <AnnouncementBar title={announcement.title} pinned={announcement.pinned} device={device} /> : null}
      <header
        className="relative z-40 border-b border-border"
        style={{ backgroundColor: `color-mix(in oklab, var(--background) ${Math.round(backgroundOpacity * 100)}%, transparent)` }}
      >
        <div className={cn("mx-auto flex h-14 w-full max-w-6xl items-center gap-1", phone ? "px-4" : "px-6")}>
          {phone && (
            <span className={buttonClasses({ variant: "ghost", size: "icon", touch: true, className: "-ml-2" })}>
              <Menu strokeWidth={1.75} />
            </span>
          )}
          <span
            className={cn(
              "-ml-1 mr-2 inline-flex min-h-11 shrink-0 items-center justify-center gap-2.5 rounded-md px-1 text-sm font-semibold tracking-tight text-foreground",
              phone && "min-w-11",
            )}
          >
            <LogoMark />
            {!phone && <span>PSA FAU Community Forum</span>}
          </span>
          {!phone && (
            <nav className="flex items-center gap-0.5">
              {navItems.map((item) => (
                <span
                  key={item.id}
                  className={cn(
                    "relative isolate inline-flex h-8 items-center whitespace-nowrap rounded-md px-2.5 text-meta font-medium",
                    active === item.id ? "bg-surface text-foreground" : "text-muted",
                  )}
                >
                  {item.label}
                </span>
              ))}
            </nav>
          )}
          <div className="ml-auto flex items-center gap-1">
            {phone ? (
              <span data-anchor="search" className={ghostIcon("search", "size-10!")}>
                <Search strokeWidth={1.75} />
              </span>
            ) : (
              <span
                data-anchor="search"
                className={cn(
                  "inline-flex h-8 w-56 shrink-0 items-center justify-start gap-2 rounded-md border border-border pr-1.5 pl-2.5 text-meta",
                  hover === "search" ? "bg-surface-hover text-muted" : "bg-surface text-subtle",
                )}
              >
                <Search aria-hidden strokeWidth={1.75} className="size-4 shrink-0" />
                <span>Search threads…</span>
                <span aria-hidden className={cn("ml-auto flex gap-0.5", hover === "search" ? "opacity-100" : "opacity-80")}>
                  <Kbd>⌘</Kbd>
                  <Kbd>K</Kbd>
                </span>
              </span>
            )}
            <span data-anchor="ask" className={ghostIcon("ask", phone ? "size-10!" : undefined)}>
              <Plus strokeWidth={1.75} />
            </span>
            {!phone && (
              <span data-anchor="theme-toggle" className={ghostIcon("theme")}>
                <ThemeIcon strokeWidth={1.75} />
              </span>
            )}
            {signedIn && (
              <span data-anchor="bell" className={ghostIcon("bell", cn("relative", phone && "size-10!"))}>
                <Bell strokeWidth={1.75} aria-hidden />
                {bellCount > 0 && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] leading-none font-semibold text-accent-foreground tabular-nums ring-2 ring-background",
                      phone ? "top-1.5 right-1.5" : "top-0.5 right-0.5",
                    )}
                    style={bellPop !== 1 ? { transform: `scale(${bellPop})` } : undefined}
                  >
                    {bellCountNode ?? (bellCount > 99 ? "99+" : bellCount)}
                  </span>
                )}
              </span>
            )}
            {signedIn ? (
              <div className="flex items-center gap-1">
                {moderation && (
                  <span
                    data-anchor="moderation"
                    className={buttonClasses({
                      variant: "ghost",
                      size: "sm",
                      hover: hover === "moderation",
                      touch: phone,
                      className: "relative px-2.5",
                    })}
                  >
                    <ShieldCheck strokeWidth={1.75} aria-hidden />
                    {moderation.pending > 0 && (
                      <span
                        aria-hidden
                        className="min-w-4 rounded-full bg-accent px-1.5 text-center text-[11px] leading-4 font-semibold text-accent-foreground tabular-nums"
                      >
                        {moderation.pendingNode ?? moderation.pending}
                      </span>
                    )}
                  </span>
                )}
                <span data-anchor="account">
                  <AccountAvatar name={userName} open={hover === "account"} className={phone ? "size-10!" : undefined} />
                </span>
              </div>
            ) : (
              <span
                data-anchor="sign-in"
                className={buttonClasses({ variant: "secondary", size: "sm", hover: hover === "signin", touch: phone, className: "ml-1" })}
              >
                Sign in
              </span>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

/** Height of the header block in site px, including the announcement bar when shown. */
export function siteHeaderHeight({
  announcement = false,
  device = "desktop",
}: { announcement?: boolean; device?: "desktop" | "phone" } = {}): number {
  const bar = device === "phone" ? ANNOUNCEMENT_BAR_HEIGHT_TOUCH : ANNOUNCEMENT_BAR_HEIGHT;
  return SITE_HEADER_HEIGHT + (announcement ? bar : 0);
}

// Widths of the right-hand controls (desktop), measured against the live header.
const ICON = 36;
const GAP = 4;
const ACCOUNT = 44;
const SIGN_IN = 64;
const MODERATION = 63;

/**
 * Centre of a desktop header control in site px from the header block's top-left corner (the
 * announcement bar included when `announcement`), for placing the film's cursor or a reveal origin.
 * `width` is the window's width in site px.
 */
export function headerAnchor(
  target: "theme-toggle" | "bell" | "account" | "ask" | "search" | "sign-in",
  {
    width,
    signedIn = false,
    moderation = false,
    announcement = false,
  }: { width: number; signedIn?: boolean; moderation?: boolean; announcement?: boolean },
): { x: number; y: number } {
  const right = (width + Math.min(width, 1152)) / 2 - 24;
  const y = siteHeaderHeight({ announcement }) - SITE_HEADER_HEIGHT + 28;
  const account = signedIn ? ACCOUNT + (moderation ? MODERATION + GAP : 0) : SIGN_IN + GAP;
  const bell = signedIn ? ICON + GAP : 0;
  const theme = right - account - GAP - bell - ICON / 2;
  const x = {
    "sign-in": right - SIGN_IN / 2,
    account: right - ACCOUNT / 2,
    bell: right - account - GAP - ICON / 2,
    "theme-toggle": theme,
    ask: theme - ICON / 2 - GAP - ICON / 2,
    search: theme - ICON / 2 - GAP - ICON - GAP - 112,
  }[target];
  return { x, y };
}
