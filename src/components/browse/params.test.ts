import { describe, expect, it } from "vitest";

import { BROWSE_QUERY_MAX, browseHref, browseParams, browseTitle, parseBrowseParams, type BrowseState } from "./params";

describe("parseBrowseParams", () => {
  it("defaults to hot, this week, page 1", () => {
    expect(parseBrowseParams({})).toEqual({ sort: "hot", period: "week", city: undefined, category: undefined, q: "", page: 1 });
  });

  it("accepts valid values and trims", () => {
    expect(parseBrowseParams({ sort: " top ", period: "year", city: "nuremberg", category: " housing ", q: "  visa  ", page: "3" })).toEqual({
      sort: "top",
      period: "year",
      city: "nuremberg",
      category: "housing",
      q: "visa",
      page: 3,
    });
  });

  it("falls back on invalid input", () => {
    const state = parseBrowseParams({ sort: "bogus", period: "decade", city: "both", page: "-2" });
    expect(state).toMatchObject({ sort: "hot", period: "week", city: undefined, page: 1 });
  });

  it("takes the first of repeated params", () => {
    expect(parseBrowseParams({ sort: ["new", "top"] }).sort).toBe("new");
  });

  it("caps the query length and keeps umlauts", () => {
    expect(parseBrowseParams({ q: "ä".repeat(BROWSE_QUERY_MAX + 50) }).q).toHaveLength(BROWSE_QUERY_MAX);
    expect(parseBrowseParams({ q: "Wohnung für Studenten" }).q).toBe("Wohnung für Studenten");
  });
});

describe("browseParams / browseHref", () => {
  const base: Omit<BrowseState, "page"> = { sort: "hot", period: "week", q: "" };

  it("leaves defaults out", () => {
    expect(browseHref("/browse", base)).toBe("/browse");
  });

  it("keeps period only for top and only when not the default", () => {
    expect(browseParams({ ...base, sort: "new", period: "year" }).period).toBeUndefined();
    expect(browseParams({ ...base, sort: "top", period: "week" }).period).toBeUndefined();
    expect(browseHref("/browse", { ...base, sort: "top", period: "all" })).toBe("/browse?sort=top&period=all");
  });

  it("encodes the query and includes filters", () => {
    expect(browseHref("/c/x", { ...base, sort: "active", city: "erlangen", category: "jobs", q: "ä & b" })).toBe(
      "/c/x?sort=active&category=jobs&city=erlangen&q=%C3%A4+%26+b",
    );
  });
});

describe("browseTitle", () => {
  it.each([
    [{ sort: "hot", period: "week" }, "Hot threads"],
    [{ sort: "new", period: "week" }, "New threads"],
    [{ sort: "active", period: "week" }, "Recently active threads"],
    [{ sort: "top", period: "all" }, "Top threads of all time"],
    [{ sort: "top", period: "month" }, "Top threads this month"],
  ] as const)("%j", (state, title) => {
    expect(browseTitle(state)).toBe(title);
  });
});
