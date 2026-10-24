type Item = { id: number };

/** The pinned lead first, then up to `limit` of the newest others without repeating it. */
export function mergeLatestAnnouncements<T extends Item>(lead: T | undefined, recent: readonly T[], limit: number): T[] {
  const rest = recent.filter((row) => row.id !== lead?.id).slice(0, limit);
  return lead ? [lead, ...rest] : rest;
}
