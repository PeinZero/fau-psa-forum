const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function recentEditsCutoff(): string {
  return new Date(Date.now() - WEEK_MS).toISOString();
}
