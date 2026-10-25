import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  bar,
  BEAT_SECONDS,
  BPM,
  DURATION,
  FPS,
  HALF_TRANSITION,
  SCENES,
  TRANSITION,
  beat,
  scene,
  type SceneId,
} from "../src/lib/timeline.ts";

const STORY_ORDER: SceneId[] = [
  "noise",
  "onePlace",
  "search",
  "answer",
  "ask",
  "bothSides",
  "startHere",
  "everything",
  "backToChat",
  "endCard",
];

describe("timeline", () => {
  it("runs 44 bars, 88 seconds at 30 fps", () => {
    assert.equal(FPS, 30);
    assert.equal(DURATION, 2640);
    assert.equal(DURATION / FPS, 88);
    assert.equal(DURATION, bar(44));
  });

  it("lists the ten scenes in story order", () => {
    assert.deepEqual(
      SCENES.map((s) => s.id),
      STORY_ORDER,
    );
  });

  it("makes scenes contiguous", () => {
    for (let i = 0; i < SCENES.length - 1; i++) {
      assert.equal(SCENES[i].cutOut, SCENES[i + 1].cut, `${SCENES[i].id} -> ${SCENES[i + 1].id}`);
    }
    assert.equal(SCENES[0].cut, 0);
    assert.equal(SCENES[SCENES.length - 1].cutOut, DURATION);
  });

  it("cuts on bar lines of the 120 BPM grid", () => {
    assert.equal(BPM, 120);
    assert.equal(BEAT_SECONDS * FPS, 15);
    assert.equal(bar(1), 60);
    for (const s of SCENES) {
      assert.equal(s.cut, bar(s.startBar), `${s.id} cut`);
      assert.equal(s.cutOut, bar(s.endBar), `${s.id} cutOut`);
      assert.equal(s.cut, beat(s.startBeat), `${s.id} beats agree with bars`);
    }
  });

  it("follows the arrangement: drop at 12 s, logo hit at 80 s", () => {
    assert.deepEqual(
      SCENES.map((s) => s.cut / FPS),
      [0, 12, 20, 30, 38, 48, 58, 66, 74, 80],
    );
    assert.equal(scene("onePlace").cut / FPS, 12);
    assert.equal(scene("endCard").cut / FPS, 80);
  });

  it("keeps transitions between 500 and 800 ms", () => {
    const ms = (TRANSITION / FPS) * 1000;
    assert.ok(ms >= 500 && ms <= 800, `${ms} ms`);
    assert.equal(HALF_TRANSITION * 2, TRANSITION);
  });

  it("has consistent from, duration and local per scene", () => {
    SCENES.forEach((s, i) => {
      const first = i === 0;
      const last = i === SCENES.length - 1;
      assert.equal(s.from, first ? 0 : s.cut - HALF_TRANSITION, `${s.id} from`);
      assert.equal(s.local, s.cut - s.from, `${s.id} local`);
      assert.equal(s.from + s.durationInFrames, last ? DURATION : s.cutOut + HALF_TRANSITION, `${s.id} end`);
      assert.ok(s.durationInFrames > TRANSITION, `${s.id} longer than a transition`);
    });
    assert.equal(SCENES[0].local, 0);
    const lastScene = SCENES[SCENES.length - 1];
    assert.equal(lastScene.from + lastScene.durationInFrames, DURATION);
  });

  it("looks scenes up by id", () => {
    assert.equal(scene("search").id, "search");
    assert.equal(scene("search").title, "Search");
    assert.equal(scene("endCard"), SCENES[9]);
  });

  it("throws for an unknown scene", () => {
    assert.throws(() => scene("nope" as SceneId), /Unknown scene nope/);
  });
});
