export type LiveImage = { storage_key: string; alt_text: string | null };

export type ImageChange = {
  /** Added images that are still on the thread, so their files can be shown. */
  added: LiveImage[];
  /** Added images that were removed again later; their files are gone. */
  addedSinceRemoved: number;
  removed: number;
};

/**
 * Compares the gallery before and after an edit. Removed files are deleted at once, so only the
 * count of removed images can be shown.
 */
export function imageChange(
  before: readonly string[] | null,
  after: readonly string[] | null,
  live: readonly LiveImage[],
): ImageChange | null {
  if (!before || !after) return null;
  const addedKeys = after.filter((key) => !before.includes(key));
  const removed = before.filter((key) => !after.includes(key)).length;
  if (addedKeys.length === 0 && removed === 0) return null;
  const added = addedKeys.flatMap((key) => live.filter((image) => image.storage_key === key));
  return { added, addedSinceRemoved: addedKeys.length - added.length, removed };
}

type ImageRevision = { id: number; thread_id: number; image_keys: string[] | null };

/** The gallery right after a revision: the next image change of that thread, or the live thread. */
export function imagesAfter(
  revision: Pick<ImageRevision, "id" | "thread_id">,
  later: readonly ImageRevision[],
  live: readonly LiveImage[] | null,
): string[] | null {
  const next = later.find((other) => other.thread_id === revision.thread_id && other.id > revision.id && other.image_keys);
  return next?.image_keys ?? live?.map((image) => image.storage_key) ?? null;
}
