import {
  AtSign,
  Award,
  Bell,
  CircleCheck,
  CircleX,
  Flag,
  Inbox,
  Megaphone,
  MessageSquare,
  Reply,
  ShieldCheck,
  ShieldX,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";

import { announcementHref } from "@/components/announcements/data";
import { Avatar } from "@/components/author";
import { SignInPrompt } from "@/components/sign-in-prompt";
import { Card, cardClasses } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { stagger } from "@/components/ui/motion";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getViewer } from "@/lib/auth/viewer";
import type { Enums } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { berlinDay, relativeTime } from "@/lib/time";
import { MarkAllReadButton, NotificationLink } from "./controls";

export const metadata: Metadata = { title: "Notifications" };

const LIMIT = 50;

type NotificationType = Enums<"notification_type">;

const notificationSelect = `
  id, type, created_at, read_at, thread_id, comment_id,
  actor:profiles!notifications_actor_id_fkey(display_name),
  thread:threads!notifications_thread_id_fkey(slug, title),
  announcement:announcements!notifications_announcement_id_fkey(id, title)
`;

/** `fetchedAt` anchors "Today" and relative times to the moment the list was read. */
async function fetchNotifications(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select(notificationSelect)
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(LIMIT);
  return { notifications: data ?? [], error, fetchedAt: Date.now() };
}

type NotificationRow = Awaited<ReturnType<typeof fetchNotifications>>["notifications"][number];

const icons: Record<NotificationType, LucideIcon> = {
  reply: Reply,
  mention: AtSign,
  thread_comment: MessageSquare,
  thread_approved: CircleCheck,
  thread_rejected: CircleX,
  best_answer: Award,
  application_approved: ShieldCheck,
  application_rejected: ShieldX,
  mod_new_thread: Inbox,
  mod_new_application: UserPlus,
  mod_new_report: Flag,
  announcement: Megaphone,
};

// Decisions and announcements come from the moderation team as a whole, so they show no moderator's name.
const systemTypes: ReadonlySet<NotificationType> = new Set([
  "thread_approved",
  "thread_rejected",
  "best_answer",
  "application_approved",
  "application_rejected",
  "announcement",
]);

function Quoted({ children }: { children: ReactNode }) {
  return <span className="font-medium text-foreground">“{children}”</span>;
}

function sentence(n: NotificationRow): ReactNode {
  const actor = <span className="font-medium text-foreground">{n.actor?.display_name ?? "Someone"}</span>;
  const title = <Quoted>{n.thread?.title ?? "a thread"}</Quoted>;
  switch (n.type) {
    case "reply":
      return <>{actor} replied to your comment in {title}</>;
    case "mention":
      return <>{actor} mentioned you in {title}</>;
    case "thread_comment":
      return <>{actor} commented on your thread {title}</>;
    case "thread_approved":
      return <>Your thread {title} was approved and is now public</>;
    case "thread_rejected":
      return <>Your thread {title} was not approved</>;
    case "best_answer":
      return <>Your comment in {title} was marked as the best answer</>;
    case "application_approved":
      return <>Your moderator application was approved. Welcome to the team</>;
    case "application_rejected":
      return <>Your moderator application was not accepted this time</>;
    case "mod_new_thread":
      return <>New thread waiting for review: {title}</>;
    case "mod_new_application":
      return <>{actor} applied to become a moderator</>;
    case "mod_new_report":
      return n.comment_id ? <>New report on a comment in {title}</> : <>New report on {title}</>;
    case "announcement":
      return n.announcement ? <>New announcement: <Quoted>{n.announcement.title}</Quoted></> : <>New announcement</>;
  }
}

function target(n: NotificationRow): string {
  switch (n.type) {
    case "mod_new_thread":
      return "/mod/threads";
    case "mod_new_application":
      return "/mod/applications";
    case "mod_new_report":
      return "/mod/reports";
    case "application_approved":
      return "/mod";
    case "application_rejected":
      return "/account";
    case "announcement":
      return n.announcement ? announcementHref(n.announcement.id) : "/announcements";
  }
  if (!n.thread) return "/account";
  return n.comment_id ? `/t/${n.thread.slug}#comment-${n.comment_id}` : `/t/${n.thread.slug}`;
}

function NotificationItem({ n, index, now }: { n: NotificationRow; index: number; now: number }) {
  const Icon = icons[n.type];
  const unread = n.read_at === null;
  const system = systemTypes.has(n.type);

  return (
    <li className="animate-fade-up" style={stagger(index)}>
      <NotificationLink
        id={n.id}
        href={target(n)}
        unread={unread}
        className={cn(
          "group flex items-start gap-3 px-4 py-3.5 transition-colors duration-150 ease-out hover:bg-surface-hover focus-visible:-outline-offset-2 sm:px-5",
          unread && "bg-accent-soft/40",
        )}
      >
        <span className="relative mt-0.5 shrink-0">
          {system ? (
            <span
              aria-hidden
              className="flex size-8 items-center justify-center rounded-full border border-accent/20 bg-accent-soft text-accent"
            >
              <Icon strokeWidth={1.75} className="size-4" />
            </span>
          ) : (
            <>
              <Avatar name={n.actor?.display_name ?? null} className="size-8 text-[11px]" />
              <span
                aria-hidden
                className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full border border-border bg-background text-muted"
              >
                <Icon strokeWidth={2} className="size-2.5" />
              </span>
            </>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block break-words text-sm leading-snug", unread ? "text-foreground" : "text-muted")}>
            {sentence(n)}
          </span>
          <time dateTime={n.created_at} className="mt-1 block text-meta text-subtle">
            {relativeTime(n.created_at, now)}
          </time>
        </span>
        {unread ? (
          <span className="mt-2 flex shrink-0 items-center">
            <span aria-hidden className="size-2 rounded-full bg-accent" />
            <span className="sr-only">Unread</span>
          </span>
        ) : null}
      </NotificationLink>
    </li>
  );
}

function Group({
  title,
  items,
  offset,
  now,
}: {
  title: string;
  items: NotificationRow[];
  offset: number;
  now: number;
}) {
  if (items.length === 0) return null;
  const id = `notifications-${title.toLowerCase()}`;
  return (
    <section aria-labelledby={id} className="space-y-2">
      <h2 id={id} className="px-1 text-meta font-medium text-muted">
        {title}
      </h2>
      <ul className={cardClasses({ padding: "none", className: "divide-y divide-border overflow-hidden" })}>
        {items.map((n, i) => (
          <NotificationItem key={n.id} n={n} index={offset + i} now={now} />
        ))}
      </ul>
    </section>
  );
}

async function NotificationsContent() {
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <>
        <PageHeader title="Notifications" />
        <Card className="text-sm">
          <SignInPrompt next="/notifications" purpose="to see replies, mentions and moderation updates." />
        </Card>
      </>
    );
  }

  const { notifications, error, fetchedAt: now } = await fetchNotifications(viewer.userId);
  const hasUnread = notifications.some((n) => n.read_at === null);

  const today = berlinDay.format(now);
  const isToday = (n: NotificationRow) => berlinDay.format(new Date(n.created_at)) === today;
  const todays = notifications.filter(isToday);
  const earlier = notifications.filter((n) => !isToday(n));

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Replies, mentions and moderation updates."
        actions={<MarkAllReadButton disabled={!hasUnread} />}
      />
      {error ? (
        <p role="alert" className="text-sm text-danger">
          Could not load your notifications. Please try again later.
        </p>
      ) : notifications.length === 0 ? (
        <EmptyState icon={<Bell />} title="You're all caught up">
          Replies to your comments, mentions and moderation decisions show up here.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          <Group title="Today" items={todays} offset={0} now={now} />
          <Group title="Earlier" items={earlier} offset={todays.length} now={now} />
          {notifications.length === LIMIT && (
            <p className="text-center text-meta text-subtle">Showing the latest {LIMIT} notifications.</p>
          )}
        </div>
      )}
    </>
  );
}

function NotificationsSkeleton() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Loading notifications…</span>
      <Skeleton className="mb-8 h-8 w-48" />
      <div className={cardClasses({ padding: "none", className: "divide-y divide-border overflow-hidden" })}>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1">
              <Skeleton className={i % 2 ? "h-4 w-2/3" : "h-4 w-4/5"} />
              <Skeleton className="mt-2 h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <Suspense fallback={<NotificationsSkeleton />}>
        <NotificationsContent />
      </Suspense>
    </div>
  );
}
