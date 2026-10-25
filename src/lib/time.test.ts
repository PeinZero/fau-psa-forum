import { describe, expect, it } from "vitest";

import { berlinDay, relativeTime } from "./time";

const now = Date.parse("2026-10-25T12:00:00Z");
const ago = (ms: number) => new Date(now - ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("relativeTime", () => {
  it("says just now below a minute, past or future", () => {
    expect(relativeTime(ago(0), now)).toBe("just now");
    expect(relativeTime(ago(59_000), now)).toBe("just now");
    expect(relativeTime(ago(-59_000), now)).toBe("just now");
  });

  it("switches to minutes, hours and days at the boundaries", () => {
    expect(relativeTime(ago(60_000), now)).toBe("1 min. ago");
    expect(relativeTime(ago(59 * MIN), now)).toBe("59 min. ago");
    expect(relativeTime(ago(HOUR), now)).toBe("1 hr. ago");
    expect(relativeTime(ago(23 * HOUR), now)).toBe("23 hr. ago");
    expect(relativeTime(ago(DAY), now)).toBe("yesterday");
    expect(relativeTime(ago(6 * DAY), now)).toBe("6 days ago");
  });

  it("formats future times", () => {
    expect(relativeTime(ago(-2 * HOUR), now)).toBe("in 2 hr.");
  });

  it("falls back to a Berlin calendar date after a week", () => {
    expect(relativeTime(ago(7 * DAY), now)).toBe("18 Oct 2026");
  });
});

describe("berlinDay", () => {
  it("splits days at Berlin midnight, not UTC", () => {
    expect(berlinDay.format(new Date("2026-10-24T21:59:00Z"))).toBe("2026-10-24");
    expect(berlinDay.format(new Date("2026-10-24T22:00:00Z"))).toBe("2026-10-25");
  });

  it("follows the daylight saving switch on 2026-10-25", () => {
    expect(berlinDay.format(new Date("2026-10-25T22:30:00Z"))).toBe("2026-10-25");
    expect(berlinDay.format(new Date("2026-10-25T23:00:00Z"))).toBe("2026-10-26");
  });
});
