import { describe, expect, it } from "vitest";

import { announcementExcerpt } from "./excerpt";

describe("announcementExcerpt", () => {
  it("strips Markdown down to plain text", () => {
    const md = "## Heading\n\n- **bold** item\n> quote with [a link](https://example.com)\n\n```\ncode\n```\n![alt](x.png)";
    expect(announcementExcerpt(md)).toBe("Heading bold item quote with a link alt");
  });

  it("keeps short text unchanged", () => {
    expect(announcementExcerpt("Salam and welcome!")).toBe("Salam and welcome!");
  });

  it("cuts long text on a word boundary with an ellipsis", () => {
    const text = "Residence permits courses housing and first steps for new students";
    const excerpt = announcementExcerpt(text, 30);
    expect(excerpt).toBe("Residence permits courses…");
    expect(excerpt.length).toBeLessThanOrEqual(31);
  });

  it("cuts mid-word when the only space is too early to keep enough text", () => {
    expect(announcementExcerpt("a Wohnungsgeberbestätigungsformular", 20)).toBe("a Wohnungsgeberbestä…");
  });

  it("returns an empty string for an empty body", () => {
    expect(announcementExcerpt("   ")).toBe("");
  });
});
