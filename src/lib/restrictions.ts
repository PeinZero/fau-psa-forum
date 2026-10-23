import type { Enums, Tables } from "@/lib/supabase/database.types";

export const CANNED_LABEL_MAX = 60;
export const CANNED_BODY_MAX = 1000;
export const RESTRICTION_REASON_MAX = 500;

/** Values are Postgres intervals, passed to `restrict_user()` as they are. */
export const RESTRICTION_DURATIONS = [
  { value: "1 day", label: "1 day" },
  { value: "7 days", label: "7 days" },
  { value: "30 days", label: "30 days" },
  { value: "permanent", label: "Permanent" },
] as const;

export type RestrictionDuration = (typeof RESTRICTION_DURATIONS)[number]["value"];
export type RestrictionKind = Enums<"restriction_kind">;
export type Restriction = Pick<Tables<"user_restrictions">, "id" | "kind" | "reason" | "expires_at" | "lifted_at">;

export function isActive(restriction: Restriction, now: number): boolean {
  return (
    restriction.lifted_at === null &&
    (restriction.expires_at === null || new Date(restriction.expires_at).getTime() > now)
  );
}

/** Active restrictions, the one that matters most first: a ban before a mute, then the longest. */
export function activeRestrictions<T extends Restriction>(rows: readonly T[], now: number): T[] {
  const end = (r: Restriction) => (r.expires_at === null ? Infinity : new Date(r.expires_at).getTime());
  return rows
    .filter((r) => isActive(r, now))
    .sort((a, b) => Number(b.kind === "ban") - Number(a.kind === "ban") || end(b) - end(a));
}

const untilFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });

/** "31 Oct 2026, 14:00" in Berlin time, the same wording the database uses in its messages. */
export function formatUntil(iso: string): string {
  return untilFormat.format(new Date(iso));
}

export function restrictionHeadline({ kind, expires_at }: Pick<Restriction, "kind" | "expires_at">): string {
  const state = kind === "ban" ? "banned" : "muted";
  return expires_at ? `Your account is ${state} until ${formatUntil(expires_at)}` : `Your account is ${state}`;
}

export function restrictionScope(kind: RestrictionKind): string {
  return kind === "ban"
    ? "You can still read the forum, but you can't post, comment, vote, report or edit your profile, threads and comments."
    : "You can still read the forum and edit what you wrote, but you can't post, comment, vote or report.";
}

/** Short status for moderator lists: "Muted until 31 Oct 2026, 14:00", "Banned permanently". */
export function restrictionStatus({ kind, expires_at }: Pick<Restriction, "kind" | "expires_at">): string {
  const state = kind === "ban" ? "Banned" : "Muted";
  return expires_at ? `${state} until ${formatUntil(expires_at)}` : `${state} permanently`;
}
