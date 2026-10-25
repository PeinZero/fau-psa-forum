// Writes the English WebVTT captions, which describe the sound (see src/lib/sound-captions.ts).
//   node --experimental-strip-types scripts/captions.ts <output.vtt>
import { writeFileSync } from "node:fs";

import { SOUND_CAPTIONS } from "../src/lib/sound-captions.ts";

function stamp(seconds: number): string {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor(ms / 60_000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms % 1000, 3)}`;
}

const cues = [...SOUND_CAPTIONS].sort((a, b) => a.from - b.from);
const body = cues.map((c, i) => `${i + 1}\n${stamp(c.from)} --> ${stamp(c.to)}\n${c.text}`).join("\n\n");
const output = process.argv[2];
if (!output) throw new Error("usage: captions.ts <output.vtt>");
writeFileSync(output, `WEBVTT\n\n${body}\n`);
console.log(`${cues.length} cues → ${output}`);
