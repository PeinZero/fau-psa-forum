import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CPS, easeOut, enter, exit, HOLD, keyFrame, MIN_TEXT, typed, typedCount, typingEnd } from "../src/lib/motion.ts";
import { FPS } from "../src/lib/timeline.ts";

const WORD = "anmledung";

describe("typing", () => {
  it("runs at six characters per second", () => {
    assert.equal(CPS, 6);
    assert.equal(keyFrame(6, 0), FPS);
  });

  it("types nothing before the start and the first character on it", () => {
    assert.equal(typed(WORD, 99, 100), "");
    assert.equal(typedCount(WORD, 0, 100), 0);
    assert.equal(typed(WORD, 100, 100), "a");
  });

  it("has typed the whole word 1.33 to 1.5 s after the start", () => {
    const start = 200;
    const end = typingEnd(WORD, start);
    const sec = (end - start) / FPS;
    assert.ok(sec >= 1.33 && sec <= 1.5, `${sec}s`);
    assert.equal(typed(WORD, end, start), WORD);
    assert.equal(typed(WORD, end - 1, start), WORD.slice(0, -1));
  });

  it("never loses characters from one frame to the next", () => {
    const start = 10;
    let prev = 0;
    for (let f = 0; f < start + 120; f++) {
      const c = typedCount(WORD, f, start);
      assert.ok(c >= prev, `frame ${f}`);
      assert.ok(c - prev <= 1, `frame ${f} jumps`);
      prev = c;
    }
    assert.equal(prev, WORD.length);
  });

  it("ends on the last key frame and never overshoots the text", () => {
    assert.equal(typingEnd(WORD, 50), keyFrame(WORD.length - 1, 50));
    assert.equal(typed(WORD, 10_000, 0), WORD);
    assert.equal(typedCount("", 100, 0), 0);
  });

  it("honours a custom speed", () => {
    assert.equal(typingEnd("abcdefghij", 0, 3), keyFrame(9, 0, 3));
    assert.ok(typingEnd("abcdefghij", 0, 3) > typingEnd("abcdefghij", 0));
  });
});

describe("enter and exit", () => {
  it("clamp to [0, 1] and hit both ends", () => {
    assert.equal(enter(-50, 10), 0);
    assert.equal(enter(10, 10), 0);
    assert.equal(enter(10 + 24, 10), 1);
    assert.equal(enter(1000, 10), 1);
    assert.equal(exit(-50, 10), 1);
    assert.equal(exit(10, 10), 1);
    assert.equal(exit(10 + 24, 10), 0);
    assert.equal(exit(1000, 10), 0);
  });

  it("stay in range, rise monotonically and complement each other", () => {
    let prev = 0;
    for (let f = -10; f < 80; f++) {
      const v = enter(f, 5, 30);
      assert.ok(v >= 0 && v <= 1);
      assert.ok(v >= prev);
      prev = v;
      assert.ok(Math.abs(v + exit(f, 5, 30) - 1) < 1e-12);
    }
  });

  it("respects a custom duration", () => {
    assert.ok(enter(20, 0, 60) < enter(20, 0, 24));
  });
});

describe("easeOut", () => {
  it("maps the ends and is front-loaded", () => {
    assert.equal(easeOut(0), 0);
    assert.equal(easeOut(1), 1);
    assert.ok(easeOut(0.5) > 0.8, `${easeOut(0.5)}`);
  });
});

describe("timing constants", () => {
  it("holds about 1.5 s and keeps text at least 2 s", () => {
    assert.equal(HOLD / FPS, 1.5);
    assert.equal(MIN_TEXT / FPS, 2);
  });
});
