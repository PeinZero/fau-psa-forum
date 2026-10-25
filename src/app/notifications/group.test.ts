import { describe, expect, it } from "vitest";

import { formatDate } from "@/lib/labels";
import { dayLabel, groupByDay } from "./group";

const now = Date.parse("2026-10-25T10:00:00Z");

describe("dayLabel", () => {
  it("labels the current Berlin day", () => {
    expect(dayLabel("2026-10-25T08:00:00Z", now)).toBe("Today");
  });
  it("uses Berlin midnight, not 24 hours", () => {
    // 22:30 UTC on the 24th is already the 25th in Berlin.
    expect(dayLabel("2026-10-24T22:30:00Z", now)).toBe("Today");
    expect(dayLabel("2026-10-24T20:00:00Z", now)).toBe("Yesterday");
  });
  it("names the weekday within a week", () => {
    expect(dayLabel("2026-10-21T12:00:00Z", now)).toBe("Wednesday");
  });
  it("falls back to the full date", () => {
    expect(dayLabel("2026-10-01T12:00:00Z", now)).toBe(formatDate("2026-10-01T12:00:00Z"));
  });
});

describe("groupByDay", () => {
  it("groups consecutive items and keeps order", () => {
    const items = [
      { id: 1, created_at: "2026-10-25T09:00:00Z" },
      { id: 2, created_at: "2026-10-25T07:00:00Z" },
      { id: 3, created_at: "2026-10-23T07:00:00Z" },
    ];
    const groups = groupByDay(items, now);
    expect(groups.map((g) => [g.label, g.items.map((i) => i.id)])).toEqual([
      ["Today", [1, 2]],
      ["Friday", [3]],
    ]);
  });
  it("returns nothing for an empty list", () => {
    expect(groupByDay([], now)).toEqual([]);
  });
});
