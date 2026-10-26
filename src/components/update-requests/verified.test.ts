import { describe, expect, it } from "vitest";

import { needsVerificationHint } from "./verified";

const NOW = new Date("2026-10-26T12:00:00Z").getTime();
const monthsAgo = (months: number) => {
  const d = new Date(NOW);
  d.setMonth(d.getMonth() - months);
  return d.toISOString();
};

describe("needsVerificationHint", () => {
  it("flags published threads nobody has re-checked for six months, against the given clock", () => {
    const thread = { status: "published", created_at: monthsAgo(8), last_verified_at: null };
    expect(needsVerificationHint(thread, NOW)).toBe(true);
  });

  it("stays quiet for recent threads and recently verified ones", () => {
    expect(needsVerificationHint({ status: "published", created_at: monthsAgo(2), last_verified_at: null }, NOW)).toBe(false);
    expect(
      needsVerificationHint({ status: "published", created_at: monthsAgo(12), last_verified_at: monthsAgo(1) }, NOW),
    ).toBe(false);
  });

  it("never flags threads that aren't published", () => {
    expect(needsVerificationHint({ status: "pending", created_at: monthsAgo(12), last_verified_at: null }, NOW)).toBe(false);
  });
});
