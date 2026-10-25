import { describe, expect, it } from "vitest";

import { GUIDE_SLUG_MAX, GUIDE_SLUG_PATTERN, slugify } from "./limits";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Anmeldung beim Amt")).toBe("anmeldung-beim-amt");
  });

  it("strips diacritics and expands ß", () => {
    expect(slugify("Straße Café Müller")).toBe("strasse-cafe-muller");
  });

  it("collapses punctuation and trims hyphens", () => {
    expect(slugify("  --Hello,   World!!  ")).toBe("hello-world");
  });

  it("returns empty for text with no latin letters", () => {
    expect(slugify("!!!")).toBe("");
    expect(slugify("")).toBe("");
  });

  it("caps the length without a trailing hyphen", () => {
    const slug = slugify(`${"a".repeat(GUIDE_SLUG_MAX - 1)} b`);
    expect(slug.length).toBeLessThanOrEqual(GUIDE_SLUG_MAX);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("always satisfies the slug pattern when non-empty", () => {
    for (const title of ["Ärger mit Visum", "Rent 101: deposits", "a_b c"]) {
      expect(slugify(title)).toMatch(GUIDE_SLUG_PATTERN);
    }
  });
});
