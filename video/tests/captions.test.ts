import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { SOUND_CAPTIONS } from "../src/lib/sound-captions.ts";
import { DURATION, FPS, scene, SCENES } from "../src/lib/timeline.ts";
import { sceneLines } from "../src/lines/index.ts";

type Cue = { start: number; end: number; text: string };

const toSeconds = (stamp: string): number => {
  const m = /^(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/.exec(stamp);
  assert.ok(m, `bad timestamp ${stamp}`);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]) / 1000;
};

describe("captions", () => {
  let dir: string;
  let vtt: string;
  let blocks: string[];
  let cues: Cue[];

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "captions-"));
    const out = join(dir, "intro.en.vtt");
    const script = fileURLToPath(new URL("../scripts/captions.ts", import.meta.url));
    const run = spawnSync(
      process.execPath,
      ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", script, out],
      { encoding: "utf8" },
    );
    assert.equal(run.status, 0, run.stderr);
    vtt = readFileSync(out, "utf8");
    blocks = vtt
      .split("\n\n")
      .slice(1)
      .filter((block) => block.trim());
    cues = blocks.map((block) => {
      const [, timing, ...text] = block.trim().split("\n");
      const [a, b] = timing.split(" --> ");
      return { start: toSeconds(a), end: toSeconds(b), text: text.join("\n") };
    });
  });

  after(() => rmSync(dir, { recursive: true, force: true }));

  it("starts with the WEBVTT header", () => {
    assert.ok(vtt.startsWith("WEBVTT\n\n"));
  });

  it("has one cue per sound description", () => {
    assert.equal(cues.length, SOUND_CAPTIONS.length);
    assert.deepEqual(
      cues.map((c) => c.text),
      [...SOUND_CAPTIONS].sort((a, b) => a.from - b.from).map((c) => c.text),
    );
  });

  it("numbers cues sequentially", () => {
    assert.deepEqual(
      blocks.map((b) => b.split("\n")[0]),
      cues.map((_, i) => String(i + 1)),
    );
  });

  it("sorts cues and keeps them from overlapping", () => {
    for (let i = 1; i < cues.length; i++) {
      assert.ok(cues[i].start >= cues[i - 1].end, `cue ${i} overlaps cue ${i - 1}`);
    }
  });

  it("shows each cue for at least two seconds inside the film", () => {
    for (const c of cues) {
      assert.ok(c.end - c.start >= 2, `"${c.text}" is ${(c.end - c.start).toFixed(2)}s`);
      assert.ok(c.start >= 0, `"${c.text}" starts before 0`);
      assert.ok(c.end <= DURATION / FPS, `"${c.text}" ends after the film`);
    }
  });

  it("describes the sound in brackets and never repeats a story line from the picture", () => {
    const storyLines = new Set(SCENES.flatMap((s) => sceneLines[s.id].map((l) => l.text)));
    for (const c of cues) {
      assert.match(c.text, /^\[[a-z ,]+\]$/, `"${c.text}" is not a sound description`);
      assert.ok(!storyLines.has(c.text), `"${c.text}" repeats an on-screen line`);
    }
  });

  it("opens with the music, carries the notifications over the chat and builds into the drop", () => {
    const drop = scene("onePlace").cut / FPS;
    assert.deepEqual(cues[0], { start: 0, end: cues[0].end, text: "[upbeat electronic music]" });
    const chat = cues.find((c) => c.text === "[message notifications]");
    assert.ok(chat && chat.start < drop && chat.end <= drop, "notifications cue sits over the chat");
    const builds = cues.find((c) => c.text === "[music builds]");
    assert.ok(builds, "a [music builds] cue exists");
    assert.equal(builds.end, drop, "the build ends on the drop");
  });
});
