import { describe, expect, it } from "vitest";

import { assembleExport, exportFilename, SECTION_KEYS, UNAVAILABLE, type SectionKey } from "./assemble";
import { exportWaitMs, EXPORT_INTERVAL_MS, signExportCookie } from "./rate-limit";

const now = new Date("2026-10-24T23:59:59Z");
const ok = (data: unknown) => ({ data, error: null });
const sections = Object.fromEntries(SECTION_KEYS.map((k) => [k, ok([])])) as Record<SectionKey, ReturnType<typeof ok>>;

describe("exportFilename", () => {
  it("uses the UTC date", () => {
    expect(exportFilename(now)).toBe("psa-forum-export-2026-10-24.json");
  });
});

describe("assembleExport", () => {
  const profile = ok({ id: "u1", username: "ayesha", role: "member", announcements_seen_at: "2026-10-01T00:00:00Z" });

  it("adds the auth email and lifts announcements_seen_at", () => {
    const out = assembleExport({ now, email: "a@fau.de", profile, sections });
    expect(out.exportedAt).toBe("2026-10-24T23:59:59.000Z");
    expect(out.profile).toEqual({ id: "u1", username: "ayesha", role: "member", email: "a@fau.de" });
    expect(out.announcements_seen_at).toBe("2026-10-01T00:00:00Z");
    expect(out.threads).toEqual([]);
  });

  it("marks only failing sections as unavailable", () => {
    const out = assembleExport({
      now,
      email: null,
      profile,
      sections: { ...sections, bookmarks: { data: null, error: { code: "42P01" } }, votes: ok([{ comment_id: 1, value: 1 }]) },
    });
    expect(out.bookmarks).toBe(UNAVAILABLE);
    expect(out.votes).toEqual([{ comment_id: 1, value: 1 }]);
  });

  it("marks a failed profile and its derived field unavailable", () => {
    const out = assembleExport({ now, email: null, profile: { data: null, error: {} }, sections });
    expect(out.profile).toBe(UNAVAILABLE);
    expect(out.announcements_seen_at).toBe(UNAVAILABLE);
  });
});

describe("exportWaitMs", () => {
  const t = 1_000_000;
  it("waits out the interval for the same user", () => {
    expect(exportWaitMs(signExportCookie("u1", t), "u1", t + 1000)).toBe(EXPORT_INTERVAL_MS - 1000);
    expect(exportWaitMs(signExportCookie("u1", t), "u1", t + EXPORT_INTERVAL_MS)).toBe(0);
  });
  it("ignores missing, forged or foreign cookies", () => {
    expect(exportWaitMs(undefined, "u1", t)).toBe(0);
    expect(exportWaitMs(`${t}.forged`, "u1", t)).toBe(0);
    expect(exportWaitMs(signExportCookie("u2", t), "u1", t)).toBe(0);
  });
});
