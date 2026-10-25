import { describe, expect, it } from "vitest";

import { parsePage } from "./pagination";

describe("parsePage", () => {
  it.each([
    ["2", 2],
    ["10", 10],
    [["4", "7"], 4],
    ["1", 1],
  ])("%j → %i", (raw, page) => expect(parsePage(raw)).toBe(page));

  it.each([undefined, "", "0", "-3", "1.5", "abc", "NaN", "Infinity", "99999999999999999999", []])("falls back to 1 for %j", (raw) => {
    expect(parsePage(raw as string)).toBe(1);
  });
});
