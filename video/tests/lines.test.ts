import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MIN_TEXT } from "../src/lib/motion.ts";
import { SCENES, type SceneId } from "../src/lib/timeline.ts";
import { sceneLines } from "../src/lines/index.ts";

describe("on-screen lines", () => {
  it("has line data for every scene", () => {
    assert.deepEqual(Object.keys(sceneLines).sort(), SCENES.map((s) => s.id).sort());
  });

  for (const scene of SCENES) {
    const lines = sceneLines[scene.id];

    describe(scene.id, () => {
      it("keeps every line readable for at least two seconds", () => {
        for (const line of lines) {
          assert.ok(line.to - line.from >= MIN_TEXT, `"${line.text}" is ${line.to - line.from} frames`);
        }
      });

      it("sits inside the scene's local span", () => {
        for (const line of lines) {
          assert.ok(line.from >= 0, `"${line.text}" starts before the scene`);
          assert.ok(line.to <= scene.durationInFrames, `"${line.text}" ends at ${line.to} > ${scene.durationInFrames}`);
        }
      });

      it("does not overlap other lines of the scene", () => {
        const sorted = [...lines].sort((a, b) => a.from - b.from);
        for (let i = 1; i < sorted.length; i++) {
          assert.ok(sorted[i].from >= sorted[i - 1].to, `"${sorted[i - 1].text}" overlaps "${sorted[i].text}"`);
        }
      });
    });
  }

  it("carries the brief's required lines verbatim", () => {
    const texts = (id: SceneId) => sceneLines[id].map((l) => l.text);
    assert.ok(texts("search").includes("Even if you can’t spell Anmeldung."));
    assert.ok(texts("bothSides").includes("Checked by people who know."));
    assert.ok(texts("endCard").includes("Asked once. Answered for everyone who comes next."));
    assert.equal(
      texts("noise").join(" "),
      "Every semester, the same questions. Every semester, the answers get buried.",
    );
  });
});
