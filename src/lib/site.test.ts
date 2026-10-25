import { describe, expect, it } from "vitest";

import { introVideo } from "./site";

describe("site config", () => {
  it("ships without an intro video until one is configured", () => {
    expect(introVideo).toBeNull();
  });
});
