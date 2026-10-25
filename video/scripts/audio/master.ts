/** Master bus: glue compression, a look-ahead soft limiter and the film-length fades. */
import { SR, type Stereo, fromDb, smooth, toDb } from "./dsp.ts";

export type CompressorOptions = {
  thresholdDb: number;
  ratio: number;
  kneeDb: number;
  attackMs: number;
  releaseMs: number;
  rmsMs: number;
};

/** Stereo-linked RMS compressor with a soft knee. Returns the deepest gain reduction in dB. */
export function compress(st: Stereo, o: CompressorOptions): number {
  const coef = (ms: number) => Math.exp(-1 / ((ms / 1000) * SR));
  const aRms = coef(o.rmsMs);
  const aAtk = coef(o.attackMs);
  const aRel = coef(o.releaseMs);
  const slope = 1 / o.ratio - 1;
  let power = 0;
  let gr = 0;
  let deepest = 0;
  for (let k = 0; k < st.l.length; k++) {
    const x = 0.5 * (st.l[k] * st.l[k] + st.r[k] * st.r[k]);
    power = aRms * power + (1 - aRms) * x;
    const over = 10 * Math.log10(power + 1e-20) - o.thresholdDb;
    let target = 0;
    if (over > o.kneeDb / 2) target = slope * over;
    else if (over > -o.kneeDb / 2) target = (slope * (over + o.kneeDb / 2) ** 2) / (2 * o.kneeDb);
    gr = target < gr ? aAtk * gr + (1 - aAtk) * target : aRel * gr + (1 - aRel) * target;
    if (gr < deepest) deepest = gr;
    const g = fromDb(gr);
    st.l[k] *= g;
    st.r[k] *= g;
  }
  return deepest;
}

/**
 * Look-ahead limiter: the required gain (with a 2 dB soft knee under the ceiling) is
 * min-filtered over the look-ahead, box-smoothed over the same length, so the gain is
 * already down when a peak arrives, then released exponentially. Returns how deep and how
 * often (percent of the time beyond 1 dB and 3 dB) it reduced.
 */
export function limit(st: Stereo, ceilingDb: number, lookaheadMs: number, releaseMs: number): LimiterStats {
  const n = st.l.length;
  const ceiling = fromDb(ceilingDb);
  const knee = fromDb(ceilingDb - 2);
  const L = Math.max(1, Math.round((lookaheadMs / 1000) * SR));
  const req = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const peak = Math.max(Math.abs(st.l[k]), Math.abs(st.r[k]));
    if (peak <= knee) {
      req[k] = 1;
    } else {
      const shaped = knee + (ceiling - knee) * Math.tanh((peak - knee) / (ceiling - knee));
      req[k] = shaped / peak;
    }
  }

  const ahead = new Float32Array(n);
  const deque = new Int32Array(n + 1);
  let head = 0;
  let tail = 0;
  let next = 0;
  for (let k = 0; k < n; k++) {
    while (next < Math.min(n, k + L)) {
      while (tail > head && req[deque[tail - 1]] >= req[next]) tail--;
      deque[tail++] = next++;
    }
    while (deque[head] < k) head++;
    ahead[k] = req[deque[head]];
  }

  const aRel = Math.exp(-1 / ((releaseMs / 1000) * SR));
  const over1 = fromDb(-1);
  const over3 = fromDb(-3);
  // Before the first sample the window holds the first look-ahead minimum, so a peak in the
  // opening milliseconds is still held under the ceiling.
  let sum = L * ahead[0];
  let g = 1;
  let deepest = 1;
  let n1 = 0;
  let n3 = 0;
  for (let k = 0; k < n; k++) {
    sum += ahead[k] - (k - L >= 0 ? ahead[k - L] : ahead[0]);
    const box = sum / L;
    g = box < g ? box : g + (box - g) * (1 - aRel);
    if (g < deepest) deepest = g;
    if (g < over1) n1++;
    if (g < over3) n3++;
    st.l[k] *= g;
    st.r[k] *= g;
  }
  return { deepestDb: toDb(deepest), over1: (100 * n1) / n, over3: (100 * n3) / n };
}

export type LimiterStats = { deepestDb: number; over1: number; over3: number };

/** Raised-cosine fade in over the first `seconds`. */
export function fadeIn(st: Stereo, seconds: number): void {
  const n = Math.round(seconds * SR);
  for (let k = 0; k < Math.min(n, st.l.length); k++) {
    const g = smooth(k / n);
    st.l[k] *= g;
    st.r[k] *= g;
  }
}

/** Fades from unity at `from` to silence at `to` (seconds); everything after is zero. */
export function fadeOut(st: Stereo, from: number, to: number): void {
  const a = Math.round(from * SR);
  const b = Math.round(to * SR);
  for (let k = a; k < st.l.length; k++) {
    const g = k >= b ? 0 : 1 - smooth((k - a) / (b - a));
    st.l[k] *= g;
    st.r[k] *= g;
  }
}
