import { formatDate } from "@/lib/labels";

/** Calendar day in Berlin, where the forum's members live; used to split "Today" from "Earlier". */
export const berlinDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" });

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "short" });

export function relativeTime(iso: string, now: number): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "just now";
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return relative.format(Math.round(seconds / 3600), "hour");
  if (abs < 7 * 86_400) return relative.format(Math.round(seconds / 86_400), "day");
  return formatDate(iso);
}
