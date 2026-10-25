import type { ReactNode } from "react";

/*
 * A generic phone: neutral dark bezel, rounded corners and a hole-punch camera. The status bar shows
 * only the time and a plain battery shape, so it reads as no particular brand or OS.
 */

const SCREEN = { width: 390, height: 844 };
const BEZEL = 12;
const RADIUS = 58;
const STATUS_BAR = 36;

/** Window size in site px for <FloatingWindow chrome="none" radius={PHONE.radius}>. */
export const PHONE = {
  width: SCREEN.width + 2 * BEZEL,
  height: SCREEN.height + 2 * BEZEL,
  radius: RADIUS,
  /** Page viewport under the status bar, in site px. */
  viewport: { width: SCREEN.width, height: SCREEN.height - STATUS_BAR },
};

export function Phone({ time = "18:10", children }: { time?: string; children: ReactNode }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        borderRadius: RADIUS,
        background: "linear-gradient(160deg, #1c1d20 0%, #111214 45%, #0c0d0f 100%)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.09), inset 0 0 0 3px rgba(0,0,0,0.5)",
      }}
    >
      <div
        className="absolute overflow-hidden bg-background"
        style={{ inset: BEZEL, borderRadius: RADIUS - BEZEL, boxShadow: "0 0 0 1px rgba(0,0,0,0.7)" }}
      >
        <StatusBar time={time} />
        <div className="absolute inset-x-0 bottom-0" style={{ top: STATUS_BAR }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function StatusBar({ time }: { time: string }) {
  return (
    <div className="absolute inset-x-0 top-0 flex items-center justify-between px-7" style={{ height: STATUS_BAR }}>
      <span className="text-[15px] leading-none font-semibold tabular-nums text-foreground">{time}</span>
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 size-[11px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "#030304", boxShadow: "0 0 0 1px rgba(255,255,255,0.07)" }}
      />
      <Battery level={0.72} />
    </div>
  );
}

function Battery({ level }: { level: number }) {
  return (
    <span aria-hidden className="flex items-center gap-[2px] text-foreground">
      <span className="relative h-[11px] w-[23px] rounded-[3.5px] border border-current opacity-90">
        <span className="absolute inset-y-[1.5px] left-[1.5px] rounded-[1.5px] bg-current" style={{ width: `${level * 17}px` }} />
      </span>
      <span className="h-[4px] w-[1.5px] rounded-r-sm bg-current opacity-60" />
    </span>
  );
}
