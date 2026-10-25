import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

// These modules pull in React components that Node cannot load without a bundler, so the
// constants are read from their source.
const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

function numberIn(text: string, pattern: RegExp): number {
  const m = pattern.exec(text);
  assert.ok(m, `no match for ${pattern}`);
  return Number(m[1]);
}

describe("framing rules", () => {
  it("caps a camera push at 6%", () => {
    assert.equal(numberIn(source("../src/stage/camera.tsx"), /export const MAX_PUSH = ([\d.]+);/), 0.06);
  });

  it("caps window tilt at 10 degrees", () => {
    assert.equal(numberIn(source("../src/stage/floating-window.tsx"), /const MAX_TILT = (\d+);/), 10);
  });

  it("keeps the member thread window tilts within the cap", () => {
    const block = /export const MEMBER_THREAD_WINDOW = \{([\s\S]*?)\n\};/.exec(source("../src/lib/handoffs.ts"));
    assert.ok(block, "MEMBER_THREAD_WINDOW not found");
    const tilts = [...block[1].matchAll(/rotate([XYZ]):\s*(-?[\d.]+)/g)];
    assert.ok(tilts.length >= 2);
    for (const [, axis, deg] of tilts) {
      assert.ok(Math.abs(Number(deg)) <= 10, `rotate${axis} ${deg}`);
    }
  });

  it("scales the hero stage above 1 so it stays legible", () => {
    const block = /export const HERO_STAGE = \{([\s\S]*?)\n\};/.exec(source("../src/lib/handoffs.ts"));
    assert.ok(block, "HERO_STAGE not found");
    assert.ok(numberIn(block[1], /scale:\s*([\d.]+)/) > 1);
  });
});
