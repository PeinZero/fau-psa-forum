import { AbsoluteFill } from "remotion";

/*
 * The stage in the light theme: the same spotlight (emerald glow over a faint grid) with the light
 * tokens of globals.css (--glow, --grid-line), on a soft off-white so white windows still lift off it.
 */
export function LightStage() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#eef0f1" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: -60,
          height: 1200,
          background: "radial-gradient(42% 48% at 50% 38%, rgb(16 185 129 / 0.12), transparent 72%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: -60,
          height: 1080,
          backgroundImage:
            "linear-gradient(to right, rgb(15 16 17 / 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgb(15 16 17 / 0.06) 1px, transparent 1px)",
          backgroundSize: "84px 84px",
          backgroundPosition: "center top",
          maskImage: "radial-gradient(ellipse 55% 60% at 50% 38%, #000 15%, transparent 72%)",
          WebkitMaskImage: "radial-gradient(ellipse 55% 60% at 50% 38%, #000 15%, transparent 72%)",
        }}
      />
      <AbsoluteFill style={{ background: "radial-gradient(120% 90% at 50% 45%, transparent 60%, rgba(15,16,17,0.08) 100%)" }} />
    </AbsoluteFill>
  );
}
