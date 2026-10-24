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
