import { describe, expect, it } from "vitest";

import { imageChange, imagesAfter } from "./image-changes";

const key = (n: number) => `threads/0000000${n}-0000-4000-8000-000000000000.webp`;
const live = (...ns: number[]) => ns.map((n) => ({ storage_key: key(n), alt_text: n === 2 ? "Anmeldung form" : null }));

describe("imageChange", () => {
  it("lists added images that are still live and counts removed ones", () => {
    expect(imageChange([key(1)], [key(2), key(3)], live(2, 3))).toEqual({
      added: live(2, 3),
      addedSinceRemoved: 0,
      removed: 1,
    });
  });

  it("counts an image added and later removed again without showing it", () => {
    expect(imageChange([], [key(2)], live())).toEqual({ added: [], addedSinceRemoved: 1, removed: 0 });
  });

  it("is null for text-only revisions and unchanged galleries", () => {
    expect(imageChange(null, [key(1)], live(1))).toBeNull();
    expect(imageChange([key(1)], null, live(1))).toBeNull();
    expect(imageChange([key(1), key(2)], [key(2), key(1)], live(1, 2))).toBeNull();
  });
});

describe("imagesAfter", () => {
  const later = [
    { id: 5, thread_id: 1, image_keys: null },
    { id: 7, thread_id: 1, image_keys: [key(1), key(2)] },
    { id: 8, thread_id: 2, image_keys: [key(9)] },
  ];

  it("takes the next image change of the same thread, skipping text-only revisions", () => {
    expect(imagesAfter({ id: 4, thread_id: 1 }, later, live(3))).toEqual([key(1), key(2)]);
  });

  it("falls back to the live gallery when no later image change exists", () => {
    expect(imagesAfter({ id: 7, thread_id: 1 }, later, live(3))).toEqual([key(3)]);
  });

  it("is null when the thread is gone", () => {
    expect(imagesAfter({ id: 7, thread_id: 1 }, later, null)).toBeNull();
  });
});
