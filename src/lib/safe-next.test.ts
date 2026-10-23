import { describe, expect, it } from "vitest";

import { safeNextPath } from "./safe-next";

describe("safeNextPath", () => {
  it("keeps same-origin paths with query and hash", () => {
    expect(safeNextPath("/t/abc?sort=new#comment-4")).toBe("/t/abc?sort=new#comment-4");
  });

  it.each([null, undefined, "", "t/abc", "https://evil.com", "javascript:alert(1)"])("falls back for %j", (value) => {
    expect(safeNextPath(value)).toBe("/");
  });

  it.each(["//evil.com", "/\\evil.com", "/\t/evil.com", "/\n/evil.com", "///evil.com"])(
    "rejects origin-changing path %j",
    (value) => {
      expect(safeNextPath(value)).toBe("/");
    },
  );
});
