import { describe, expect, it } from "vitest";
import { avatarSrc, founders, shapeContributors } from "./team";

describe("founders", () => {
  it("names the founder and co-founder with GitHub profiles", () => {
    expect(founders.map((f) => [f.name, f.role])).toEqual([
      ["Mahad Khalid Tarar", "Founder"],
      ["Abdul Moeez", "Co-founder"],
    ]);
    for (const f of founders) expect(f.github).toBe(`https://github.com/${f.githubHandle}`);
  });
});

describe("shapeContributors", () => {
  const base = { avatar_url: "https://a/1", html_url: "https://github.com/x" };
  it("removes bots and drops counts", () => {
    const out = shapeContributors([
      { ...base, login: "x", type: "User", contributions: 9 } as never,
      { ...base, login: "dependabot[bot]", type: "Bot" },
      { ...base, login: "other[bot]", type: "User" },
    ]);
    expect(out).toEqual([{ login: "x", avatarUrl: "https://a/1", profileUrl: "https://github.com/x" }]);
    expect(out[0]).not.toHaveProperty("contributions");
  });
  it("handles empty input", () => expect(shapeContributors([])).toEqual([]));
});

describe("avatarSrc", () => {
  it("appends size with the right separator", () => {
    expect(avatarSrc("https://a/1")).toBe("https://a/1?s=80");
    expect(avatarSrc("https://a/1?v=4", 40)).toBe("https://a/1?v=4&s=40");
  });
});
