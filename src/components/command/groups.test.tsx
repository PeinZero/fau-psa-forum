import { describe, expect, it } from "vitest";

import { buildGroups, type GroupInput, searchHref } from "./groups";
import type { SearchThread } from "./types";

const visa: SearchThread = {
  slug: "residence-permit",
  title: "How do I extend my residence permit?",
  category: { slug: "rp-visa", name: "RP & Visa" },
  city: "erlangen",
  commentCount: 3,
};
const categories = [
  { slug: "rp-visa", name: "RP & Visa" },
  { slug: "accommodation", name: "Accommodation" },
];

function groups(input: Partial<GroupInput>) {
  return buildGroups({ query: "", threads: [], recent: [], categories, canModerate: false, noThreads: false, ...input });
}

const outline = (input: Partial<GroupInput>) =>
  groups(input).map((group) => [group.heading, group.items.map((item) => item.label)]);

describe("searchHref", () => {
  it("trims and encodes the query and the category", () => {
    expect(searchHref("  WG & Zimmer ")).toBe("/search?q=WG+%26+Zimmer");
    expect(searchHref("visa", "rp-visa")).toBe("/search?q=visa&category=rp-visa");
  });
});

describe("buildGroups", () => {
  it("opens on recent threads, actions and categories", () => {
    expect(outline({ recent: [visa] })).toEqual([
      ["Recent threads", [visa.title]],
      ["Quick actions", ["Ask a question", "Announcements", "About", "Contributors"]],
      ["Browse categories", ["RP & Visa", "Accommodation"]],
      ["Search in a category", ["Search in RP & Visa", "Search in Accommodation"]],
    ]);
  });

  it("shows moderation only to moderators", () => {
    const labels = (canModerate: boolean) => groups({ canModerate }).flatMap((group) => group.items.map((item) => item.label));
    expect(labels(false)).not.toContain("Moderation");
    expect(labels(true)).toContain("Moderation");
  });

  it("drops empty groups while suggestions are still loading", () => {
    expect(outline({ categories: [] }).map(([heading]) => heading)).toEqual(["Quick actions"]);
  });

  it("lists matching threads, then jumps, then search", () => {
    expect(outline({ query: "visa", threads: [visa] })).toEqual([
      ["Threads", [visa.title]],
      ["Jump to", ["RP & Visa"]],
      ["Search", ["Search all results for “visa”", "Search in RP & Visa"]],
    ]);
  });

  it("matches actions by their keywords", () => {
    expect(outline({ query: "new thread" })).toContainEqual(["Jump to", ["Ask a question"]]);
  });

  it("links threads and category searches to the right pages", () => {
    const items = groups({ query: "visa", threads: [visa] }).flatMap((group) => group.items);
    expect(items.map((item) => item.href)).toEqual([
      "/t/residence-permit",
      "/c/rp-visa",
      "/search?q=visa",
      "/search?q=visa&category=rp-visa",
    ]);
  });

  it("leads with Ask a question when nothing matches", () => {
    const result = groups({ query: "thread", noThreads: true });
    expect(result.map((group) => group.heading)).toEqual(["Next steps"]);
    expect(result[0].items.map((item) => item.label)).toEqual(["Ask a question", "Search all results for “thread”"]);
    expect(result[0].items[0]).toMatchObject({ href: "/new", meta: expect.any(String) });
  });
});
