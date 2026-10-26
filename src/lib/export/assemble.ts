export const UNAVAILABLE = "unavailable" as const;

export type SectionResult = { data: unknown; error: unknown };

export const SECTION_KEYS = [
  "threads",
  "images",
  "comments",
  "votes",
  "bookmarks",
  "follows",
  "notification_preferences",
  "notifications",
  "reports",
  "update_requests",
  "moderator_applications",
  "guide_progress",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

export type ExportInput = {
  now: Date;
  email: string | null;
  profile: SectionResult;
  sections: Record<SectionKey, SectionResult>;
};

function section(result: SectionResult): unknown {
  return result.error || result.data === undefined ? UNAVAILABLE : result.data;
}

/** The profile email lives in auth, so it is added from the session and any copy on the row is dropped. */
function profileSection(result: SectionResult, email: string | null): unknown {
  const row = section(result);
  if (row === UNAVAILABLE || row === null || typeof row !== "object") return row;
  const copy: Record<string, unknown> = { ...row };
  delete copy.announcements_seen_at;
  return { ...copy, email };
}

export function assembleExport({ now, email, profile, sections }: ExportInput) {
  const profileRow = profile.data as Record<string, unknown> | null;
  const seen = profile.error || profileRow === null ? UNAVAILABLE : (profileRow?.announcements_seen_at ?? null);

  return {
    exportedAt: now.toISOString(),
    profile: profileSection(profile, email),
    threads: section(sections.threads),
    images: section(sections.images),
    comments: section(sections.comments),
    votes: section(sections.votes),
    bookmarks: section(sections.bookmarks),
    follows: section(sections.follows),
    notification_preferences: section(sections.notification_preferences),
    notifications: section(sections.notifications),
    reports: section(sections.reports),
    update_requests: section(sections.update_requests),
    moderator_applications: section(sections.moderator_applications),
    guide_progress: section(sections.guide_progress),
    announcements_seen_at: seen,
  };
}

export function exportFilename(now: Date): string {
  return `psa-forum-export-${now.toISOString().slice(0, 10)}.json`;
}
