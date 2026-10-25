import { Audio, Sequence, staticFile } from "remotion";

import { keyFrame } from "../lib/motion";

/** Subtle UI sounds; each lives in public/audio/sfx-<kind>.wav (rendered by `npm run score`). */
export type SfxKind = "key" | "click" | "vote" | "check" | "notify";

type SfxProps = {
  kind: SfxKind;
  /** Local frame the sound starts. */
  at: number;
  volume?: number;
};

/** Four slightly different key ticks, so a typed line never sounds like one sample on repeat. */
const KEY_VARIANTS = ["sfx-key", "sfx-key-2", "sfx-key-3", "sfx-key-4"];

/** The longest sound, the notification bell, rings for 0.7 s. */
const SOUND_FRAMES = 24;

function SfxFile({ file, at, volume }: { file: string; at: number; volume: number }) {
  return (
    <Sequence from={at} durationInFrames={SOUND_FRAMES} layout="none" name={`sfx:${file}`}>
      <Audio src={staticFile(`audio/${file}.wav`)} volume={volume} />
    </Sequence>
  );
}

export function Sfx({ kind, at, volume = 1 }: SfxProps) {
  return <SfxFile file={`sfx-${kind}`} at={at} volume={volume} />;
}

/** Which key tick each character gets: fixed per position, never the same one twice in a row. */
function keyVariants(count: number): number[] {
  const picks: number[] = [];
  for (let i = 0; i < count; i++) {
    // The hash's top bits vary; its low bits would just cycle through the four ticks in order.
    let pick = Math.imul(i + 1, 2654435761) >>> 30;
    if (i > 0 && pick === picks[i - 1]) pick = (pick + 1) % KEY_VARIANTS.length;
    picks.push(pick);
  }
  return picks;
}

/** One soft key tick per typed character (spaces included, they are keys too). */
export function TypingSfx({ text, start, cps, volume = 1 }: { text: string; start: number; cps?: number; volume?: number }) {
  const variants = keyVariants(Array.from(text).length);
  return (
    <>
      {variants.map((variant, i) => (
        <SfxFile
          key={i}
          file={KEY_VARIANTS[variant]}
          at={keyFrame(i, start, cps)}
          volume={volume * (0.85 + (0.15 * ((i * 7) % 3)) / 2)}
        />
      ))}
    </>
  );
}
