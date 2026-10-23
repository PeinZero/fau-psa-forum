import { describe, expect, it } from "vitest";

import { berlinDayStart, describeLogEntry, isModAction, logPartsToText, type LogEntry } from "./log-format";

const ali = { display_name: "Ali", username: "ali" };
const bilal = { display_name: "Bilal", username: "bilal" };
const base: LogEntry = {
  action: "thread_approved",
  reason: null,
  details: null,
  thread_id: 1,
  comment_id: null,
  actor: ali,
  target: bilal,
  thread: { slug: "rp-erlangen", title: "RP in Erlangen" },
};
const text = (entry: Partial<LogEntry>) => logPartsToText(describeLogEntry({ ...base, ...entry }));

describe("describeLogEntry", () => {
  it("links actor and live thread title", () => {
    const parts = describeLogEntry(base);
    expect(logPartsToText(parts)).toBe("Ali approved “RP in Erlangen”");
    expect(parts).toContainEqual({ text: "Ali", href: "/u/ali" });
    expect(parts).toContainEqual({ text: "RP in Erlangen", href: "/t/rp-erlangen", quoted: true });
  });

  it("falls back to the stored title without a link when the thread is deleted", () => {
    const parts = describeLogEntry({ ...base, action: "thread_rejected", thread: null, thread_id: null, details: { title: "Old" } });
    expect(logPartsToText(parts)).toBe("Ali rejected “Old”");
    expect(parts).toContainEqual({ text: "Old", href: undefined, quoted: true });
  });

  it("handles a deleted actor and a deleted thread without a stored title", () => {
    expect(text({ actor: null, thread: null })).toBe("A deleted moderator approved a deleted thread");
  });

  it("links a hidden comment and handles a deleted author", () => {
    const entry = { action: "comment_hidden", comment_id: 7 } as const;
    const parts = describeLogEntry({ ...base, ...entry });
    expect(logPartsToText(parts)).toBe("Ali hid a comment by Bilal in “RP in Erlangen”");
    expect(parts).toContainEqual({ text: "a comment", href: "/t/rp-erlangen#comment-7" });
    expect(text({ ...entry, target: null })).toBe("Ali hid a comment by a deleted user in “RP in Erlangen”");
  });

  it("describes best answers", () => {
    expect(text({ action: "best_answer_set", comment_id: 3 })).toBe("Ali marked Bilal's comment as the best answer in “RP in Erlangen”");
    expect(text({ action: "best_answer_set", comment_id: 3, target: { display_name: "Anas", username: null } })).toBe(
      "Ali marked Anas' comment as the best answer in “RP in Erlangen”",
    );
  });

  it("names the report reason", () => {
    expect(text({ action: "report_resolved", details: { report_reason: "Spam" } })).toBe("Ali resolved a report (Spam) on “RP in Erlangen”");
    expect(text({ action: "report_dismissed", comment_id: 2, details: {} })).toBe("Ali dismissed a report on a comment in “RP in Erlangen”");
  });

  it("distinguishes setting and removing the outdated flag", () => {
    expect(text({ action: "thread_outdated", details: { outdated: true } })).toBe("Ali flagged “RP in Erlangen” as outdated");
    expect(text({ action: "thread_outdated", details: { outdated: false } })).toBe("Ali removed the outdated flag from “RP in Erlangen”");
  });

  it("describes role changes", () => {
    expect(text({ action: "role_changed", details: { from: "member", to: "moderator" } })).toBe("Ali changed Bilal's role from member to moderator");
  });

  it("states mute expiry or permanence", () => {
    expect(text({ action: "user_muted", details: { kind: "mute", expires_at: "2026-10-31T13:00:00Z" } })).toBe(
      "Ali muted Bilal until 31 Oct 2026, 14:00",
    );
    expect(text({ action: "user_muted", details: { expires_at: null } })).toBe("Ali muted Bilal permanently");
    expect(text({ action: "user_banned", details: { expires_at: null } })).toBe("Ali banned Bilal permanently");
  });

  it("names which restriction was lifted", () => {
    expect(text({ action: "user_unrestricted", details: { kind: "mute" } })).toBe("Ali lifted the mute on Bilal");
    expect(text({ action: "user_unrestricted", details: { kind: "ban" } })).toBe("Ali lifted the ban on Bilal");
  });

  it("describes categories, announcements and guides", () => {
    const none = { thread: null, target: null };
    expect(text({ ...none, action: "category_created", details: { name: "Sports" } })).toBe("Ali created the category “Sports”");
    expect(text({ ...none, action: "category_updated", details: { name: "B", old_name: "A" } })).toBe("Ali renamed the category “A” to “B”");
    const announcement = describeLogEntry({ ...base, ...none, action: "announcement_created", details: { announcement_id: 4, title: "Iftar" } });
    expect(logPartsToText(announcement)).toBe("Ali posted the announcement “Iftar”");
    expect(announcement.some((part) => typeof part !== "string" && part.href?.includes("announcement-4"))).toBe(true);
    const guide = describeLogEntry({ ...base, ...none, action: "guide_created", details: { title: "Anmeldung", slug: "anmeldung" } });
    expect(guide).toContainEqual({ text: "Anmeldung", href: "/guides/anmeldung", quoted: true });
    const deleted = describeLogEntry({ ...base, ...none, action: "guide_deleted", details: { title: "Anmeldung", slug: "anmeldung" } });
    expect(deleted).toContainEqual({ text: "Anmeldung", href: undefined, quoted: true });
  });

  it("describes reviewed edits", () => {
    expect(text({ action: "revision_reviewed" })).toBe("Ali reviewed an edit of “RP in Erlangen” by Bilal");
  });
});

describe("isModAction", () => {
  it("accepts known actions only", () => {
    expect(isModAction("user_banned")).toBe(true);
    expect(isModAction("toString")).toBe(false);
    expect(isModAction("nope")).toBe(false);
  });
});

describe("berlinDayStart", () => {
  it("uses the winter and summer offsets", () => {
    expect(berlinDayStart("2026-01-15")).toBe("2026-01-14T23:00:00.000Z");
    expect(berlinDayStart("2026-07-15")).toBe("2026-07-14T22:00:00.000Z");
  });

  it("handles days around the clock changes", () => {
    expect(berlinDayStart("2026-03-29")).toBe("2026-03-28T23:00:00.000Z");
    expect(berlinDayStart("2026-03-30")).toBe("2026-03-29T22:00:00.000Z");
    expect(berlinDayStart("2026-10-25")).toBe("2026-10-24T22:00:00.000Z");
    expect(berlinDayStart("2026-10-26")).toBe("2026-10-25T23:00:00.000Z");
  });

  it("gives the start of the next day with an offset", () => {
    expect(berlinDayStart("2026-10-24", 1)).toBe("2026-10-24T22:00:00.000Z");
    expect(berlinDayStart("2026-12-31", 1)).toBe("2026-12-31T23:00:00.000Z");
  });

  it("rejects malformed and impossible dates", () => {
    expect(berlinDayStart("2026-02-30")).toBeNull();
    expect(berlinDayStart("26-1-1")).toBeNull();
    expect(berlinDayStart("")).toBeNull();
  });
});
