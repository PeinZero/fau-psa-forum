import { formatDate } from "@/lib/labels";
import { berlinDay } from "@/lib/time";

export type DayGroup<T> = { label: string; items: T[] };

const weekday = new Intl.DateTimeFormat("en", { timeZone: "Europe/Berlin", weekday: "long" });

const DAY_MS = 86_400_000;

/** Whole Berlin calendar days between two instants, so "Yesterday" follows the member's midnight, not 24 hours. */
function daysAgo(iso: string, now: number): number {
  const day = (ms: number) => Date.parse(`${berlinDay.format(ms)}T00:00:00Z`);
  return Math.round((day(now) - day(Date.parse(iso))) / DAY_MS);
}

export function dayLabel(iso: string, now: number): string {
  const ago = daysAgo(iso, now);
  if (ago <= 0) return "Today";
  if (ago === 1) return "Yesterday";
  return ago < 7 ? weekday.format(new Date(iso)) : formatDate(iso);
}

/** Splits a newest-first list into consecutive day groups. */
export function groupByDay<T extends { created_at: string }>(items: T[], now: number): DayGroup<T>[] {
  const groups: DayGroup<T>[] = [];
  for (const item of items) {
    const label = dayLabel(item.created_at, now);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}
