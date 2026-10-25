import { formatUntil } from "@/lib/restrictions";
import type { Enums, Json } from "@/lib/supabase/database.types";

export type ModAction = Enums<"moderation_action">;
export type LogPart = string | { text: string; href?: string; quoted?: boolean };

type LogProfile = { display_name: string; username: string | null } | null;

export type LogEntry = {
  action: ModAction;
  reason: string | null;
  details: Json | null;
  thread_id: number | null;
  comment_id: number | null;
  actor: LogProfile;
  target: LogProfile;
  thread: { slug: string; title: string } | null;
};

export const LOG_ACTION_GROUPS: ReadonlyArray<{ label: string; actions: Partial<Record<ModAction, string>> }> = [
  {
    label: "Threads",
    actions: {
      thread_approved: "Thread approved",
      thread_rejected: "Thread rejected",
      thread_archived: "Thread archived",
      thread_unarchived: "Thread unarchived",
      thread_pinned: "Thread pinned",
      thread_unpinned: "Thread unpinned",
      thread_verified: "Thread verified",
      thread_outdated: "Outdated flag changed",
      revision_reviewed: "Edit reviewed",
      thread_deleted: "Thread deleted",
    },
  },
  {
    label: "Comments",
    actions: {
      comment_hidden: "Comment hidden",
      comment_unhidden: "Comment unhidden",
      best_answer_set: "Best answer set",
      best_answer_unset: "Best answer removed",
    },
  },
  {
    label: "Reports and requests",
    actions: {
      report_resolved: "Report resolved",
      report_dismissed: "Report dismissed",
      update_request_resolved: "Update request resolved",
      update_request_dismissed: "Update request dismissed",
    },
  },
  {
    label: "Members",
    actions: {
      application_approved: "Application approved",
      application_rejected: "Application rejected",
      role_changed: "Role changed",
      user_muted: "User muted",
      user_banned: "User banned",
      user_unrestricted: "Restriction lifted",
    },
  },
  {
    label: "Content",
    actions: {
      category_created: "Category created",
      category_updated: "Category updated",
      category_deleted: "Category deleted",
      announcement_created: "Announcement posted",
      announcement_deleted: "Announcement deleted",
      guide_created: "Guide created",
      guide_deleted: "Guide deleted",
    },
  },
];

export const LOG_ACTION_LABELS = Object.fromEntries(
  LOG_ACTION_GROUPS.flatMap((group) => Object.entries(group.actions)),
) as Record<ModAction, string>;

export function isModAction(value: string): value is ModAction {
  return Object.hasOwn(LOG_ACTION_LABELS, value);
}

function detail(details: Json | null, key: string): Json | undefined {
  return details !== null && typeof details === "object" && !Array.isArray(details) ? details[key] : undefined;
}

function detailText(details: Json | null, key: string): string | undefined {
  const value = detail(details, key);
  return typeof value === "string" && value ? value : undefined;
}

function detailNumber(details: Json | null, key: string): number | undefined {
  const value = detail(details, key);
  return typeof value === "number" ? value : undefined;
}

/** Plain-text possessive that also works for names ending in "s". */
function possessive(name: string): string {
  return name.endsWith("s") ? `${name}'` : `${name}'s`;
}

export function describeLogEntry(entry: LogEntry): LogPart[] {
  const { action, details, thread, actor, target } = entry;

  const person = (profile: LogProfile, fallback: string): LogPart =>
    profile ? { text: profile.display_name, href: profile.username ? `/u/${profile.username}` : undefined } : fallback;
  const who = person(actor, "A deleted moderator");
  const subject = person(target, "someone");
  const subjectDeleted = person(target, "a deleted user");

  const title = thread?.title ?? detailText(details, "title") ?? "a deleted thread";
  const threadPart: LogPart = {
    text: title,
    href: thread ? `/t/${thread.slug}` : undefined,
    quoted: Boolean(thread?.title ?? detailText(details, "title")),
  };
  const commentHref = thread && entry.comment_id !== null ? `/t/${thread.slug}#comment-${entry.comment_id}` : undefined;
  const quoted = (text: string | undefined, href?: string): LogPart => ({ text: text ?? "a deleted item", href, quoted: Boolean(text) });

  switch (action) {
    case "thread_approved":
      return [who, " approved ", threadPart];
    case "thread_rejected":
      return [who, " rejected ", threadPart];
    case "thread_archived":
      return [who, " archived ", threadPart];
    case "thread_unarchived":
      return [who, " unarchived ", threadPart];
    case "thread_pinned":
      return [who, " pinned ", threadPart];
    case "thread_unpinned":
      return [who, " unpinned ", threadPart];
    case "thread_verified":
      return [who, " verified ", threadPart];
    case "thread_outdated":
      return detail(details, "outdated") === false
        ? [who, " removed the outdated flag from ", threadPart]
        : [who, " flagged ", threadPart, " as outdated"];
    case "comment_hidden":
    case "comment_unhidden": {
      const verb = action === "comment_hidden" ? " hid " : " unhid ";
      return [who, verb, { text: "a comment", href: commentHref }, " by ", subjectDeleted, " in ", threadPart];
    }
    case "best_answer_set":
      return [who, " marked ", { text: `${target ? possessive(target.display_name) : "a deleted user's"} comment`, href: commentHref }, " as the best answer in ", threadPart];
    case "best_answer_unset":
      return [who, " removed the best answer mark from ", { text: `${target ? possessive(target.display_name) : "a deleted user's"} comment`, href: commentHref }, " in ", threadPart];
    case "report_resolved":
    case "report_dismissed": {
      const reportReason = detailText(details, "report_reason");
      const verb = action === "report_resolved" ? " resolved " : " dismissed ";
      return [who, verb, reportReason ? `a report (${reportReason}) on ` : "a report on ", ...(entry.comment_id !== null ? [{ text: "a comment", href: commentHref }, " in "] : []), threadPart];
    }
    case "update_request_resolved":
    case "update_request_dismissed": {
      const verb = action === "update_request_resolved" ? " resolved " : " dismissed ";
      return [who, verb, "an update request on ", threadPart];
    }
    case "application_approved":
      return [who, " approved the application of ", subjectDeleted];
    case "application_rejected":
      return [who, " rejected the application of ", subjectDeleted];
    case "role_changed": {
      const from = detailText(details, "from");
      const to = detailText(details, "to");
      return [who, " changed ", subjectPossessive(target), " role", from ? ` from ${from}` : "", to ? ` to ${to}` : ""];
    }
    case "category_created":
      return [who, " created the category ", quoted(detailText(details, "name"))];
    case "category_updated": {
      const oldName = detailText(details, "old_name");
      const name = detailText(details, "name");
      return oldName && name && oldName !== name
        ? [who, " renamed the category ", quoted(oldName), " to ", quoted(name)]
        : [who, " updated the category ", quoted(name)];
    }
    case "category_deleted":
      return [who, " deleted the category ", quoted(detailText(details, "name"))];
    case "announcement_created": {
      const id = detailNumber(details, "announcement_id");
      return [who, " posted the announcement ", quoted(detailText(details, "title"), id === undefined ? "/announcements" : `/announcements/${id}`)];
    }
    case "announcement_deleted":
      return [who, " deleted the announcement ", quoted(detailText(details, "title"))];
    case "guide_created": {
      const slug = detailText(details, "slug");
      return [who, " created the guide ", quoted(detailText(details, "title"), slug ? `/guides/${slug}` : undefined)];
    }
    case "guide_deleted":
      return [who, " deleted the guide ", quoted(detailText(details, "title"))];
    case "revision_reviewed":
      return [who, " reviewed an edit of ", threadPart, ...(target ? [" by ", subject] : [])];
    case "thread_deleted":
      return [who, " deleted ", threadPart, ...(target ? [" by ", subject] : [])];
    case "user_muted":
    case "user_banned": {
      const expires = detailText(details, "expires_at");
      const verb = action === "user_muted" ? " muted " : " banned ";
      return [who, verb, subjectDeleted, expires ? ` until ${formatUntil(expires)}` : " permanently"];
    }
    case "user_unrestricted": {
      const kind = detailText(details, "kind");
      return [who, kind === "ban" ? " lifted the ban on " : kind === "mute" ? " lifted the mute on " : " lifted the restriction on ", subjectDeleted];
    }
  }
}

function subjectPossessive(target: LogProfile): LogPart {
  return target ? { text: possessive(target.display_name), href: target.username ? `/u/${target.username}` : undefined } : "a deleted user's";
}

/** Plain text of a sentence, for tests and accessible labels. */
export function logPartsToText(parts: readonly LogPart[]): string {
  return parts.map((part) => (typeof part === "string" ? part : part.quoted ? `“${part.text}”` : part.text)).join("");
}

const berlinParts = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Berlin",
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

function berlinOffsetMs(instant: number): number {
  const p = Object.fromEntries(berlinParts.formatToParts(new Date(instant)).map((part) => [part.type, Number(part.value)]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(instant / 1000) * 1000;
}

/** Valid YYYY-MM-DD calendar date, or null. */
export function parseDay(value: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const check = new Date(Date.UTC(y, m - 1, d));
  return check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === d ? { y, m, d } : null;
}

/** UTC instant (ISO) at which the given Berlin calendar day starts; `offsetDays` 1 gives the start of the next day. */
export function berlinDayStart(value: string, offsetDays = 0): string | null {
  const day = parseDay(value);
  if (!day) return null;
  const wall = Date.UTC(day.y, day.m - 1, day.d + offsetDays);
  // Midnight is never inside a DST gap in Berlin (changes happen at 02:00/03:00), so two passes settle the offset.
  let instant = wall - berlinOffsetMs(wall);
  instant = wall - berlinOffsetMs(instant);
  return new Date(instant).toISOString();
}
