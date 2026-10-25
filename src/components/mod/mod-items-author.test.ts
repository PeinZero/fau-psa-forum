import { describe, expect, it, vi } from "vitest";

import { commentModItems } from "./comment-mod-actions";
import { threadModItems } from "./thread-mod-panel";

vi.mock("./actions", () => ({
  moderateComment: vi.fn(),
  moderateThread: vi.fn(),
  deleteThread: vi.fn(),
  markThreadVerified: vi.fn(),
  restrictUser: vi.fn(),
}));

const labels = (items: unknown[]) => items.map((i) => (i && typeof i === "object" && "label" in i ? (i as { label: string }).label : null));
const run = vi.fn();
const thread = { id: 1, status: "published" as const, is_outdated: false, is_pinned: false };

describe("mute entries", () => {
  it("appear for a member author only", () => {
    const author = { id: "u1", name: "Sana" };
    expect(labels(threadModItems(thread, run, { author }))).toContain("Mute author…");
    expect(labels(threadModItems(thread, run))).not.toContain("Mute author…");
    expect(labels(commentModItems({ threadId: 1, commentId: 2, isBest: false, isHidden: false, author }, run))).toContain("Mute author…");
    expect(labels(commentModItems({ threadId: 1, commentId: 2, isBest: false, isHidden: false, author: null }, run))).not.toContain("Mute author…");
  });
});
