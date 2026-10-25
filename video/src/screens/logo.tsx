import type { CSSProperties } from "react";

/** The forum's logo exactly as src/app/icon.svg draws it: emerald rounded square, white "P" stroke. */
export function Logo({ size, style }: { size: number; style?: CSSProperties }) {
  return (
    <svg
      aria-label="PSA FAU Community Forum"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      shapeRendering="geometricPrecision"
      style={{ display: "block", ...style }}
    >
      <rect width="24" height="24" rx="6" fill="#059669" />
      <path
        d="M9 17.5V6.5h4a3.25 3.25 0 0 1 0 6.5H9"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A wide, soft emerald light behind the whole end card, centred on the logo at frame y `centerY`. */
export function LogoBloom({ centerY, opacity = 1 }: { centerY: number; opacity?: number }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: "50%",
        top: centerY,
        width: 1700,
        height: 1000,
        transform: "translate(-50%, -50%)",
        background:
          "radial-gradient(closest-side, rgb(16 185 129 / 0.34), rgb(16 185 129 / 0.14) 45%, rgb(16 185 129 / 0.04) 75%, transparent)",
        opacity,
        pointerEvents: "none",
      }}
    />
  );
}

/** A soft emerald glow that sits beneath the logo on the stage. */
export function LogoGlow({ size, opacity = 1 }: { size: number; opacity?: number }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        left: "50%",
        top: "62%",
        width: size * 2.4,
        height: size * 1.1,
        transform: "translate(-50%, -50%)",
        background: "radial-gradient(closest-side, rgb(16 185 129 / 0.28), rgb(16 185 129 / 0.08) 55%, transparent)",
        filter: `blur(${size * 0.12}px)`,
        opacity,
        pointerEvents: "none",
      }}
    />
  );
}
