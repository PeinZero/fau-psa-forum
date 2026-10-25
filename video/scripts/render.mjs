// Renders the film and every deliverable into ../public/video/:
//   node scripts/render.mjs [--skip-master] [--only=mp4,webm,poster,captions] [--video-kbps=N]
// The master is a near-lossless H.264 plus a WAV of the mix; the web files are encoded from it
// in two passes so the bitrate goes where the picture needs it.
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { enableTailwind } from "@remotion/tailwind-v4";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicVideo = path.resolve(root, "../public/video");
const outDir = path.join(root, "out");
mkdirSync(publicVideo, { recursive: true });
mkdirSync(outDir, { recursive: true });

const flags = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, v] = a.slice(2).split("=");
      return [k, v ?? "true"];
    }),
);
const only = new Set((flags.only ?? "mp4,webm,poster,captions").split(","));

/** The hero shot, fully built: headline, both buttons and the trust line. */
const POSTER_FRAME = Number(flags["poster-frame"] ?? 540);
/** The MP4 must stay under 15 MB (decimal); the streams aim lower to leave room for the container. */
const LIMIT_BYTES = 15_000_000;
const BUDGET_BYTES = 14_500_000;
// Hats and supersaws smear below this in AAC.
const AUDIO_KBPS = 128;

const masterVideo = path.join(outDir, "master.mp4");
const masterAudio = path.join(outDir, "master.wav");

const serveUrl = await bundle({
  entryPoint: path.join(root, "src/index.ts"),
  webpackOverride: (config) => enableTailwind(config),
  publicDir: path.join(root, "public"),
});
const composition = await selectComposition({ serveUrl, id: "Film" });
const seconds = composition.durationInFrames / composition.fps;

if (flags["skip-master"] !== "true" && (only.has("mp4") || only.has("webm"))) {
  let last = -1;
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    crf: 8,
    x264Preset: "slow",
    imageFormat: "png",
    pixelFormat: "yuv420p",
    // Browsers decode HD video as BT.709; tagging it so keeps #08090a and the emerald exact.
    colorSpace: "bt709",
    muted: true,
    outputLocation: masterVideo,
    chromiumOptions: { gl: "angle" },
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 100);
      if (pct % 5 === 0 && pct !== last) {
        last = pct;
        console.log(`master video ${pct}%`);
      }
    },
  });
  await renderMedia({ composition, serveUrl, codec: "wav", outputLocation: masterAudio });
  console.log("master done");
}

function ffmpeg(args) {
  execFileSync("npx", ["remotion", "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", ...args], {
    cwd: root,
    stdio: "inherit",
  });
}

const colorTags = ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"];

const videoKbps = Number(flags["video-kbps"] ?? Math.floor((BUDGET_BYTES * 8) / seconds / 1000 - AUDIO_KBPS));

if (only.has("mp4")) {
  const out = path.join(publicVideo, "intro.mp4");
  const log = path.join(outDir, "x264");
  const common = [
    "-c:v", "libx264", "-preset", "veryslow", "-tune", "animation",
    "-b:v", `${videoKbps}k`, "-maxrate", `${videoKbps * 2}k`, "-bufsize", `${videoKbps * 4}k`,
    "-profile:v", "high", "-pix_fmt", "yuv420p", "-g", "150", "-keyint_min", "30",
    "-x264-params", "aq-mode=3:aq-strength=0.9:deblock=-1,-1",
    ...colorTags, "-passlogfile", log,
  ];
  ffmpeg(["-i", masterVideo, ...common, "-pass", "1", "-an", "-f", "mp4", "/dev/null"]);
  ffmpeg([
    "-i", masterVideo, "-i", masterAudio, "-map", "0:v", "-map", "1:a",
    ...common, "-pass", "2",
    "-c:a", "aac", "-b:a", `${AUDIO_KBPS}k`, "-movflags", "+faststart", out,
  ]);
  const size = statSync(out).size;
  console.log(`mp4 ${(size / 1e6).toFixed(2)} MB at ${videoKbps} kbps video`);
  if (size >= LIMIT_BYTES) throw new Error(`intro.mp4 is ${size} bytes, over the 15 MB limit`);
}

if (only.has("webm")) {
  const out = path.join(publicVideo, "intro.webm");
  const log = path.join(outDir, "vp9");
  const common = [
    "-c:v", "libvpx-vp9", "-b:v", `${videoKbps}k`, "-row-mt", "1", "-tile-columns", "2",
    "-g", "150", "-pix_fmt", "yuv420p", ...colorTags, "-passlogfile", log,
  ];
  ffmpeg(["-i", masterVideo, ...common, "-deadline", "good", "-cpu-used", "4", "-pass", "1", "-an", "-f", "webm", "/dev/null"]);
  ffmpeg([
    "-i", masterVideo, "-i", masterAudio, "-map", "0:v", "-map", "1:a",
    ...common, "-deadline", "good", "-cpu-used", "1", "-pass", "2",
    "-c:a", "libopus", "-b:a", `${AUDIO_KBPS}k`, out,
  ]);
  console.log(`webm ${(statSync(out).size / 1e6).toFixed(2)} MB`);
}

if (only.has("poster")) {
  const out = path.join(publicVideo, "poster.webp");
  await renderStill({
    composition,
    serveUrl,
    frame: POSTER_FRAME,
    output: out,
    imageFormat: "webp",
    scale: 1280 / composition.width,
    chromiumOptions: { gl: "angle" },
  });
  console.log(`poster ${out}`);
}

if (only.has("captions")) {
  execFileSync(
    process.execPath,
    ["--experimental-strip-types", "--disable-warning=ExperimentalWarning", "scripts/captions.ts", path.join(publicVideo, "intro.en.vtt")],
    { cwd: root, stdio: "inherit" },
  );
}
