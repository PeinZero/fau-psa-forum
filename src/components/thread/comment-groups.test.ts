import { describe, expect, it } from "vitest";

import { groupComments, sortGroups } from "./comment-groups";
import type { CommentDetail } from "./thread-data";

function comment(id: number, parentId: number | null, score: number, createdAt: string): CommentDetail {
  return { id, parent_id: parentId, score, created_at: createdAt } as CommentDetail;
}

const ids = (groups: ReturnType<typeof groupComments>) => groups.map((g) => g.id);

describe("groupComments", () => {
  it("nests replies under their parent", () => {
    const groups = groupComments([
      comment(1, null, 0, "2026-01-01T10:00:00Z"),
      comment(2, null, 0, "2026-01-01T11:00:00Z"),
      comment(3, 1, 0, "2026-01-01T12:00:00Z"),
    ]);
    expect(ids(groups)).toEqual([1, 2]);
    expect(groups[0].replies.map((r) => r.id)).toEqual([3]);
  });

  it("keeps replies of a hidden parent as a group without a comment", () => {
    const [group] = groupComments([comment(5, 9, 0, "2026-01-01T10:00:00Z")]);
    expect(group.comment).toBeNull();
    expect(group.replies).toHaveLength(1);
  });
});

describe("sortGroups", () => {
  const groups = groupComments([
    comment(1, null, 2, "2026-01-01T10:00:00Z"),
    comment(2, null, 5, "2026-01-01T11:00:00Z"),
    comment(3, null, 5, "2026-01-01T09:00:00Z"),
    comment(4, 99, 0, "2026-01-01T12:00:00Z"),
  ]);

  it("Top: highest score first, older first on ties, orphan groups score 0", () => {
    expect(ids(sortGroups(groups, "top"))).toEqual([3, 2, 1, 99]);
  });

  it("Newest: latest first, orphan groups by their first reply", () => {
    expect(ids(sortGroups(groups, "new"))).toEqual([99, 2, 1, 3]);
  });

  it("does not mutate its input", () => {
    const before = ids(groups);
    sortGroups(groups, "top");
    expect(ids(groups)).toEqual(before);
  });
});
