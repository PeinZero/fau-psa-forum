export const EMAIL_FREQUENCIES = ["off", "instant", "daily"] as const;
export type EmailFrequency = (typeof EMAIL_FREQUENCIES)[number];

export type NotificationTypeOption = { type: string; label: string; description: string };
export type NotificationGroup = { title: string; moderatorOnly?: boolean; options: NotificationTypeOption[] };

export const NOTIFICATION_GROUPS: NotificationGroup[] = [
  {
    title: "Conversations",
    options: [
      { type: "reply", label: "Replies to you", description: "Someone replies to your comment." },
      { type: "mention", label: "Mentions", description: "Someone mentions you with @username." },
      { type: "thread_comment", label: "Comments on your threads", description: "New comments on threads you wrote." },
      { type: "followed_thread_activity", label: "Activity on threads you follow", description: "New comments and best answers on followed threads." },
      { type: "best_answer", label: "Best answer", description: "Your comment is picked as the best answer." },
    ],
  },
  {
    title: "Your content and account",
    options: [
      { type: "thread_approved", label: "Thread approved", description: "A moderator publishes your thread." },
      { type: "thread_rejected", label: "Thread rejected", description: "A moderator declines your thread." },
      { type: "thread_deleted", label: "Thread deleted", description: "A moderator deletes your thread." },
      { type: "application_approved", label: "Moderator application approved", description: "Your moderator application is accepted." },
      { type: "application_rejected", label: "Moderator application declined", description: "Your moderator application is not accepted." },
      { type: "announcement", label: "Announcements", description: "News from the PSA team." },
    ],
  },
  {
    title: "Moderation",
    moderatorOnly: true,
    options: [
      { type: "mod_new_thread", label: "New pending thread", description: "A thread is waiting for review." },
      { type: "mod_new_application", label: "New moderator application", description: "Someone applies to become a moderator." },
      { type: "mod_new_report", label: "New report", description: "A post or comment is reported." },
      { type: "mod_new_update_request", label: "Update requests", description: "A member asks for a thread to be updated." },
      { type: "mod_new_feedback", label: "New feedback", description: "A member sends feedback about the forum." },
    ],
  },
];

export const ALL_NOTIFICATION_TYPES: string[] = NOTIFICATION_GROUPS.flatMap((g) => g.options.map((o) => o.type));

export const FREQUENCY_OPTIONS: { value: EmailFrequency; label: string; description: string }[] = [
  { value: "off", label: "Off", description: "No emails." },
  { value: "instant", label: "Instant", description: "One email per notification." },
  { value: "daily", label: "Daily digest", description: "One summary email per day." },
];
