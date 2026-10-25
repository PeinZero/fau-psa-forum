import { describe, expect, it } from "vitest";

import { mergeLatestAnnouncements } from "./announcements";

const a = (id: number) => ({ id, title: `Announcement ${id}` });

describe("mergeLatestAnnouncements", () => {
  it("puts the pinned lead first and fills up with the newest others", () => {
    expect(mergeLatestAnnouncements(a(1), [a(4), a(3), a(2)], 2).map((x) => x.id)).toEqual([1, 4, 3]);
  });

  it("does not repeat the lead when it is also among the newest", () => {
    expect(mergeLatestAnnouncements(a(4), [a(4), a(3), a(2)], 2).map((x) => x.id)).toEqual([4, 3, 2]);
  });

  it("shows only the newest when nothing is pinned", () => {
    expect(mergeLatestAnnouncements(undefined, [a(3), a(2), a(1)], 2).map((x) => x.id)).toEqual([3, 2]);
  });

  it("returns an empty list when there are no announcements", () => {
    expect(mergeLatestAnnouncements(undefined, [], 2)).toEqual([]);
  });

  it("keeps a lone pinned lead", () => {
    expect(mergeLatestAnnouncements(a(7), [a(7)], 2).map((x) => x.id)).toEqual([7]);
  });
});
