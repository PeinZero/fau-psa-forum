import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { target, type NotificationTarget } from "./target";

const base: NotificationTarget = {
  type: "reply",
  comment_id: null,
  thread: { slug: "residence-permit-erlangen" },
  announcement: null,
};

describe("target", () => {
  it.each([
    ["mod_new_thread", "/mod/threads"],
    ["mod_new_application", "/mod/applications"],
    ["mod_new_report", "/mod/reports"],
    ["mod_new_update_request", "/mod/updates"],
    ["mod_new_feedback", "/mod/feedback"],
    ["mod_thread_edited", "/mod/edits"],
  ] as const)("sends %s to its moderator queue, not the thread", (type, href) => {
    expect(target({ ...base, type })).toBe(href);
  });

  it("links a comment notification to the comment", () => {
    expect(target({ ...base, comment_id: 42 })).toBe("/t/residence-permit-erlangen#comment-42");
  });

  it("links a thread notification to the thread", () => {
    expect(target({ ...base, type: "thread_approved" })).toBe("/t/residence-permit-erlangen");
  });

  it("falls back to the account page when the thread is gone", () => {
    expect(target({ ...base, thread: null })).toBe("/account");
  });

  it("opens nothing for a deleted thread", () => {
    expect(target({ ...base, type: "thread_deleted", thread: null })).toBeUndefined();
  });

  it("opens the announcement, or the list when it was removed", () => {
    expect(target({ ...base, type: "announcement", announcement: { id: 7 } })).toBe("/announcements/7");
    expect(target({ ...base, type: "announcement" })).toBe("/announcements");
  });
});
