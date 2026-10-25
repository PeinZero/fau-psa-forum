import { describe, expect, it } from "vitest";

import { countLabel } from "./labels";

describe("countLabel", () => {
  it.each([
    [0, "0 comments"],
    [1, "1 comment"],
    [2, "2 comments"],
    [1000, "1000 comments"],
  ])("%i → %s", (count, label) => {
    expect(countLabel(count, "comment")).toBe(label);
  });

  it("takes an irregular plural", () => {
    expect(countLabel(1, "reply", "replies")).toBe("1 reply");
    expect(countLabel(3, "reply", "replies")).toBe("3 replies");
  });
});

describe("formatDate", () => {
  it("formats in Berlin time", async () => {
    const { formatDate } = await import("./labels");
    expect(formatDate("2026-10-25T12:00:00Z")).toBe("25 Oct 2026");
    expect(formatDate("2026-12-31T23:30:00Z")).toBe("1 Jan 2027");
  });
});
