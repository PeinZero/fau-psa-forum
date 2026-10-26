import { announcementHref } from "@/components/announcements/data";
import type { Enums } from "@/lib/supabase/database.types";

export type NotificationTarget = {
  type: Enums<"notification_type">;
  comment_id: number | null;
  thread: { slug: string } | null;
  announcement: { id: number } | null;
};

/** A deleted thread leaves nothing to open. */
export function target(n: NotificationTarget): string | undefined {
  switch (n.type) {
    case "thread_deleted":
      return undefined;
    case "mod_new_thread":
      return "/mod/threads";
    case "mod_new_application":
      return "/mod/applications";
    case "mod_new_report":
      return "/mod/reports";
    case "mod_new_update_request":
      return "/mod/updates";
    case "mod_new_feedback":
      return "/mod/feedback";
    case "mod_thread_edited":
      return "/mod/edits";
    case "application_approved":
      return "/mod";
    case "application_rejected":
    case "account_muted":
    case "account_banned":
    case "account_unrestricted":
      return "/account";
    case "announcement":
      return n.announcement ? announcementHref(n.announcement.id) : "/announcements";
  }
  if (!n.thread) return "/account";
  return n.comment_id ? `/t/${n.thread.slug}#comment-${n.comment_id}` : `/t/${n.thread.slug}`;
}
