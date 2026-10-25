/** 16-bit PCM WAV in and out. */
import { readFileSync, writeFileSync } from "node:fs";

import { SR, type Stereo } from "./dsp.ts";
import type { Rng } from "./rng.ts";

/** Writes 48 kHz stereo 16-bit with TPDF dither; true digital silence stays silent. */
export function writeWav(path: string, st: Stereo, dither: Rng): void {
  const n = st.l.length;
  const bytes = n * 4;
  const buf = Buffer.alloc(44 + bytes);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + bytes, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(bytes, 40);
  let o = 44;
  for (let k = 0; k < n; k++) {
    const silent = Math.abs(st.l[k]) < 1e-7 && Math.abs(st.r[k]) < 1e-7;
    for (const x of [st.l[k], st.r[k]]) {
      const d = silent ? 0 : dither() - dither();
      const q = Math.round(x * 32767 + d);
      buf.writeInt16LE(Math.max(-32768, Math.min(32767, q)), o);
      o += 2;
    }
  }
  writeFileSync(path, buf);
}

/** Reads a 16-bit PCM WAV (mono is duplicated to both sides). */
export function readWav(path: string): { st: Stereo; sampleRate: number } {
  const buf = readFileSync(path);
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") throw new Error(`${path}: not a WAV file`);
  let pos = 12;
  let channels = 0;
  let sampleRate = 0;
  let bits = 0;
  while (pos + 8 <= buf.length) {
    const id = buf.toString("ascii", pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const body = pos + 8;
    if (id === "fmt ") {
      channels = buf.readUInt16LE(body + 2);
      sampleRate = buf.readUInt32LE(body + 4);
      bits = buf.readUInt16LE(body + 14);
    } else if (id === "data") {
      if (bits !== 16) throw new Error(`${path}: expected 16-bit PCM, got ${bits}-bit`);
      const frames = Math.floor(size / (2 * channels));
      const st: Stereo = { l: new Float32Array(frames), r: new Float32Array(frames) };
      for (let k = 0; k < frames; k++) {
        const at = body + k * 2 * channels;
        st.l[k] = buf.readInt16LE(at) / 32767;
        st.r[k] = channels > 1 ? buf.readInt16LE(at + 2) / 32767 : st.l[k];
      }
      return { st, sampleRate };
    }
    pos = body + size + (size % 2);
  }
  throw new Error(`${path}: no data chunk`);
}
