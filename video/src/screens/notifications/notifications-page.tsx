import { BellRing, CheckCheck, CircleCheck, type LucideIcon, MessageSquare } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { Avatar } from "../../ui/avatar";
import { buttonClasses } from "../../ui/button";
import { cn } from "../../ui/cn";

/*
 * The member's notifications page (src/app/notifications/page.tsx): page header with "Mark all as
 * read", the day group, then one row per notification with its icon or the actor's avatar, the
 * sentence, the relative time and the unread dot. The bell in the header links here; it has no menu.
 */

export type NotificationKind =
  /** A moderator approved the member's thread. */
  | "thread_approved"
  /** Someone commented on the member's thread. */
  | "thread_comment"
  /** A best answer in a thread the member follows (authors follow their own threads). */
  | "followed_best_answer";

export type DemoNotification = {
  kind: NotificationKind;
  /** Thread title as the sentence quotes it. */
  title: string;
  /** Who commented; moderation decisions come from the team and show no name. */
  actor?: string;
  /** Relative time as the page prints it ("just now", "8 min. ago"). */
  time: string;
  unread: boolean;
};

const icons: Record<NotificationKind, LucideIcon> = {
  thread_approved: CircleCheck,
  thread_comment: MessageSquare,
  followed_best_answer: BellRing,
};

/** Decisions come from the moderation team as a whole, so these rows show an icon, not a person. */
const fromTeam: Record<NotificationKind, boolean> = {
  thread_approved: true,
  thread_comment: false,
  followed_best_answer: true,
};

function Quoted({ children }: { children: ReactNode }) {
  return <span className="font-medium text-foreground">“{children}”</span>;
}

function sentence(n: DemoNotification): ReactNode {
  const title = <Quoted>{n.title}</Quoted>;
  switch (n.kind) {
    case "thread_approved":
      return <>Your thread {title} was approved and is now public</>;
    case "thread_comment":
      return (
        <>
          <span className="font-medium text-foreground">{n.actor ?? "Someone"}</span> commented on your thread {title}
        </>
      );
    case "followed_best_answer":
      return <>An answer in {title}, a thread you follow, was marked as the best answer</>;
  }
}

/** One row of the list; unread rows sit on a soft emerald tint with a dot on the right. */
export function NotificationItem({ n, narrow = false }: { n: DemoNotification; narrow?: boolean }) {
  const Icon = icons[n.kind];
  return (
    <div className={cn("flex items-start gap-3 rounded-lg px-3 py-4", !narrow && "px-4", n.unread && "bg-accent-soft/40")}>
      <span className="relative mt-0.5 shrink-0">
        {fromTeam[n.kind] ? (
          <span aria-hidden className="flex size-8 items-center justify-center rounded-full border border-accent/20 bg-accent-soft text-accent">
            <Icon strokeWidth={1.75} className="size-4" />
          </span>
        ) : (
          <>
            <Avatar name={n.actor ?? null} className="size-8 text-[11px]" />
            <span
              aria-hidden
              className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full border border-border bg-background text-muted"
            >
              <Icon strokeWidth={1.75} className="size-2.5" />
            </span>
          </>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-body break-words", n.unread ? "text-foreground" : "text-muted")}>{sentence(n)}</span>
        <span className="block text-meta text-muted tabular-nums">{n.time}</span>
      </span>
      {n.unread && (
        <span className="mt-2 flex shrink-0 items-center">
          <span aria-hidden className="size-2 rounded-full bg-accent" />
        </span>
      )}
    </div>
  );
}

export type NotificationEntry = {
  n: DemoNotification;
  /** 0 → 1 the row's fade-up as the page loads (the site staggers them by 40 ms). */
  enter?: number;
};

/**
 * The page body below the site header, newest first under one "Today" group. `narrow` is the layout
 * below 640px: the header stacks its button under the title and the rows keep their small inset.
 */
export function NotificationsPage({
  items,
  narrow = false,
  touch = false,
  scrollY = 0,
  style,
}: {
  items: NotificationEntry[];
  narrow?: boolean;
  /** 44px buttons, as on phones. */
  touch?: boolean;
  /** Page scroll in site px. */
  scrollY?: number;
  style?: CSSProperties;
}) {
  const hasUnread = items.some(({ n }) => n.unread);
  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-background", touch && "phone-type")} style={style}>
      <div style={{ transform: `translateY(${-scrollY}px)` }}>
        <main className={cn("mx-auto w-full max-w-6xl", narrow ? "px-4 py-6" : "px-6 py-8")}>
          <div className="mx-auto w-full max-w-3xl">
            <div className={cn("mb-8 flex gap-4", narrow ? "flex-col" : "flex-row items-end justify-between")}>
              <div className="min-w-0">
                <h1 className="text-display font-semibold tracking-tight text-foreground">Notifications</h1>
                <p className="mt-2 max-w-2xl text-body text-muted">Replies, mentions and moderation updates.</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <span className={buttonClasses({ variant: "secondary", size: "sm", touch, disabled: !hasUnread })}>
                  <CheckCheck strokeWidth={1.75} />
                  Mark all as read
                </span>
              </div>
            </div>
            <section>
              <h2 className="text-body font-semibold text-foreground">Today</h2>
              <ul className={cn("mt-2 flex flex-col gap-0.5", narrow ? "-mx-3" : "-mx-4")}>
                {items.map(({ n, enter = 1 }) => (
                  <li
                    key={n.kind}
                    style={enter < 1 ? { opacity: enter, transform: `translateY(${(1 - enter) * 6}px)` } : undefined}
                  >
                    <NotificationItem n={n} narrow={narrow} />
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
