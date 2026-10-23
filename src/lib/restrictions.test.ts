import { describe, expect, it } from "vitest";

import { activeRestrictions, isActive, restrictionHeadline, restrictionStatus, type Restriction } from "./restrictions";

const NOW = new Date("2026-10-24T12:00:00Z").getTime();
const base: Restriction = { id: 1, kind: "mute", reason: "Spam", expires_at: null, lifted_at: null };

describe("isActive", () => {
  it("counts permanent and future restrictions, not lifted or expired ones", () => {
    expect(isActive(base, NOW)).toBe(true);
    expect(isActive({ ...base, expires_at: "2026-10-25T12:00:00Z" }, NOW)).toBe(true);
    expect(isActive({ ...base, expires_at: "2026-10-24T11:59:00Z" }, NOW)).toBe(false);
    expect(isActive({ ...base, lifted_at: "2026-10-24T10:00:00Z" }, NOW)).toBe(false);
  });
});

describe("activeRestrictions", () => {
  it("puts a ban first, then the restriction that lasts longest", () => {
    const rows: Restriction[] = [
      { ...base, id: 1, expires_at: "2026-10-25T12:00:00Z" },
      { ...base, id: 2, kind: "ban", expires_at: "2026-10-26T12:00:00Z" },
      { ...base, id: 3 },
      { ...base, id: 4, lifted_at: "2026-10-24T10:00:00Z" },
    ];
    expect(activeRestrictions(rows, NOW).map((r) => r.id)).toEqual([2, 3, 1]);
  });
});

describe("wording", () => {
  it("names the end date in Berlin time, or none for a permanent restriction", () => {
    expect(restrictionHeadline({ kind: "mute", expires_at: "2026-10-31T13:00:00Z" })).toBe(
      "Your account is muted until 31 Oct 2026, 14:00",
    );
    expect(restrictionHeadline({ kind: "ban", expires_at: null })).toBe("Your account is banned");
    expect(restrictionStatus({ kind: "ban", expires_at: null })).toBe("Banned permanently");
    expect(restrictionStatus({ kind: "mute", expires_at: "2026-10-31T13:00:00Z" })).toBe("Muted until 31 Oct 2026, 14:00");
  });
});
