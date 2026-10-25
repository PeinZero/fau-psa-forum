import { AbsoluteFill } from "remotion";

/*
 * Extra emerald light behind the wall at the peak, over the stage's own spotlight, so the gaps
 * between cards glow instead of reading as empty black while the wall is still building.
 */
export function PeakGlow({ strength = 1 }: { strength?: number }) {
  return (
    <AbsoluteFill
      style={{
        opacity: strength,
        background:
          "radial-gradient(60% 70% at 58% 60%, rgb(16 185 129 / 0.26), rgb(16 185 129 / 0.1) 55%, transparent 84%)",
      }}
    />
  );
}
