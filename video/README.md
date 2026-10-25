# Intro film

The 88-second launch film on Home, built in code with Remotion. It has its own package so the
Next app and its build stay untouched; the root `tsconfig.json` and ESLint config skip this folder.

```sh
cd video
npm install
npm run studio     # preview and scrub in the browser
npm test           # timeline, chat script, typing, captions and content rules
npx tsc --noEmit
npm run score      # render the score and UI sounds into public/audio/ (studio and render run it first)
node scripts/stills.mjs Film 90 480 --out=out/stills/check   # stills of any composition
npm run render     # master + every file in ../public/video/
```

`npm run render` writes `intro.mp4` (H.264, two passes, under 15 MB), `intro.webm` (VP9),
`poster.webp` (1280×720, from the hero shot) and `intro.en.vtt` to `../public/video/`. To show
the film on Home, set `introVideo` in `src/lib/site.ts`:

```ts
export const introVideo: IntroVideo | null = {
  title: "How the PSA FAU Community Forum works",
  durationLabel: "1:28",
  poster: "/video/poster.webp",
  captions: "/video/intro.en.vtt",
  source: { kind: "file", mp4: "/video/intro.mp4", webm: "/video/intro.webm" },
};
```

## How it fits together

- `src/lib/timeline.ts`: 120 BPM, 44 bars of 2 s. Every scene cut is on a bar line, and the score
  is arranged on the same table: the chat over a filtered pulse (bars 1–6), the drop on the hero
  (bar 7, 12 s), the groove under search, answer, ask and both sides, the hook again on Start here,
  the peak on the feature wall, a breakdown back in the chat and the final hit on the logo (80 s).
  Each scene also has its own composition (`S01-noise` …).
- `src/lib/chat-beats.ts`: the beats on which every "Queries" message lands; the score plays a
  notification pop on each, so the chat is the rhythm.
- `src/stage/`: the backdrop (the hero spotlight), floating windows, camera, cursor and the
  on-screen story lines. `src/lib/handoffs.ts` holds the framings shared across match cuts.
- `src/ui/` and `src/screens/`: the site's components rebuilt with the same tokens
  (`src/styles.css` mirrors `src/app/globals.css`) and real copy from `docs/content/`.
- `src/lines/`: each scene's on-screen story lines.
- `src/lib/sound-captions.ts`: the captions. They describe the sound, because the story lines
  are already in the picture.
- The `Gallery` composition shows each rebuilt screen on its own frame, for checking it against
  the live site after a change to the site's components.
- `scripts/score.ts`, `scripts/audio/`: the electronic-pop score (kick, claps, hats, sidechained
  supersaws, arp, sub, lead hook) and the UI sounds, synthesised without samples.

Change copy or a starter thread title on the site, and the film needs the same change in
`src/screens/demo-data.ts` and a new render.
