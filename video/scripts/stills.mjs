// Renders stills of one composition after a single bundle:
//   node scripts/stills.mjs <compositionId> <frame> [<frame> ...] [--scale=0.5] [--out=out/stills]
// Frames are local to the composition. Files land in out/stills/<composition>-<frame>.png.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { enableTailwind } from "@remotion/tailwind-v4";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flags = Object.fromEntries(
  args
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, v] = a.slice(2).split("=");
      return [k, v ?? "true"];
    }),
);
const [id, ...frames] = args.filter((a) => !a.startsWith("--"));
if (!id || frames.length === 0) {
  console.error("usage: node scripts/stills.mjs <compositionId> <frame> [<frame> ...] [--scale=0.5]");
  process.exit(1);
}

const outDir = path.resolve(root, flags.out ?? "out/stills");
mkdirSync(outDir, { recursive: true });

const serveUrl = await bundle({
  entryPoint: path.join(root, "src/index.ts"),
  webpackOverride: (config) => enableTailwind(config),
  publicDir: path.join(root, "public"),
});
const composition = await selectComposition({ serveUrl, id });
for (const f of frames) {
  const frame = Number(f);
  const output = path.join(outDir, `${id}-${frame}.png`);
  await renderStill({
    composition,
    serveUrl,
    frame,
    output,
    scale: Number(flags.scale ?? 1),
    chromiumOptions: { gl: "angle" },
    // --logs prints the page's console, e.g. layout measurements logged from a component.
    onBrowserLog: flags.logs ? (log) => console.log(`[browser] ${log.text}`) : undefined,
  });
  console.log(output);
}
