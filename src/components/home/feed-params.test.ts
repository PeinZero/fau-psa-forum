import { describe, expect, it } from "vitest";

import { browseAllHref, homeSortHref, homeSorts, parseHomeSort } from "./feed-params";

describe("parseHomeSort", () => {
  it.each(["hot", "new", "top"] as const)("accepts %s", (sort) => {
    expect(parseHomeSort(sort)).toBe(sort);
  });

  it.each([undefined, "", "active", "HOT", "bogus"])("falls back to hot for %j", (raw) => {
    expect(parseHomeSort(raw)).toBe("hot");
  });

  it("trims and takes the first of repeated params", () => {
    expect(parseHomeSort(" new ")).toBe("new");
    expect(parseHomeSort(["top", "new"])).toBe("top");
  });
});

describe("home feed links", () => {
  it("keeps the default sort off the URL", () => {
    expect(homeSortHref("hot")).toBe("/");
    expect(homeSortHref("new")).toBe("/?sort=new");
    expect(homeSortHref("top")).toBe("/?sort=top");
  });

  it("continues on /browse with the same sort", () => {
    expect(browseAllHref("hot")).toBe("/browse");
    expect(browseAllHref("new")).toBe("/browse?sort=new");
    expect(browseAllHref("top")).toBe("/browse?sort=top");
  });

  it("offers Hot, New and Top in that order", () => {
    expect(homeSorts.map((sort) => sort.label)).toEqual(["Hot", "New", "Top"]);
  });
});
