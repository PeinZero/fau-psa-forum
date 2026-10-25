import { useCurrentFrame } from "remotion";

import { Sfx } from "../audio/sfx";
import { easeInOut, enter, mix } from "../lib/motion";
import { localBar, scene } from "../lib/timeline";
import { firstWeeksGuide } from "../screens/guide/guide-data";
import { columnLeft, GUIDE_LAYOUT, GuidePage, stepTop } from "../screens/guide/guide-page";
import { Camera } from "../stage/camera";
import { Cursor, type CursorPoint } from "../stage/cursor";
import { FloatingWindow } from "../stage/floating-window";
import { SceneShell } from "../stage/scene-shell";

const S = scene("startHere");
const BEAT = 15;

/** One tick on each downbeat of the hook's second, third and fourth bar, with a bar of music each. */
export const START_HERE_CHECKS = [30, 31, 32].map((n) => localBar("startHere", n));

const STEP_COUNT = firstWeeksGuide.steps.length;

/* The guide page as a big window: at this scale the "3 of 8 done" label reads at about 30 frame px. */
const WIDTH = 640;
const HEIGHT = 600;
const SCALE = 2.25;
const PUSH = 0.04;
/** Frame y of the window's top edge when the shot opens: a strip of stage and rim light above it. */
const WINDOW_TOP = 30;
/** The camera keeps climbing the page so step 3 is well inside the frame by its tick. */
const DRIFT = 120;
const COLUMN_LEFT = columnLeft(WIDTH);
/** Below step 3 the list fades into the stage: the next steps hint at the rest without a hard crop. */
const LIST_FADE = "linear-gradient(to bottom, #000 455px, transparent 545px)";

/* Steps fade up on eighth notes from the cut. */
const STEP_ENTER = 12;
const stepLands = (i: number) => S.local + (BEAT / 2) * (i + 1);

/* Tick: the site's 150 ms fill, 300 ms bar, and the count rolling over, slowed for film. */
const TICK = 9;
const BAR = 15;
const ROLL = 12;

function checkbox(index: number) {
  return {
    x: COLUMN_LEFT + GUIDE_LAYOUT.checkbox.x,
    y: stepTop(index) + GUIDE_LAYOUT.checkbox.y,
  };
}

/** The pointer glides in, ticks each box on its beat, steps aside so the tick shows, and leaves. */
function cursorPath(): CursorPoint[] {
  const points: CursorPoint[] = [];
  START_HERE_CHECKS.forEach((click, i) => {
    const box = checkbox(i);
    if (i === 0) points.push({ frame: click - 32, x: box.x + 260, y: box.y + 90 });
    points.push({ frame: click, x: box.x + 3, y: box.y + 4, click: true });
    points.push({ frame: click + 12, x: box.x - 30, y: box.y + 20 });
  });
  const last = checkbox(START_HERE_CHECKS.length - 1);
  points.push({ frame: START_HERE_CHECKS[START_HERE_CHECKS.length - 1] + 40, x: last.x + 200, y: last.y + 70 });
  return points;
}

export function StartHereScene() {
  const frame = useCurrentFrame();
  const lastTick = START_HERE_CHECKS[START_HERE_CHECKS.length - 1];

  const steps = firstWeeksGuide.steps.map((_, i) => ({
    appear: enter(frame, stepLands(i) - STEP_ENTER, STEP_ENTER),
    checked: i < START_HERE_CHECKS.length ? enter(frame, START_HERE_CHECKS[i], TICK) : 0,
  }));
  const progress = START_HERE_CHECKS.reduce((sum, tick) => sum + enter(frame, tick, BAR), 0) / STEP_COUNT;

  // The window turns slowly towards the camera for the whole shot, so the picture never stands still.
  const turn = frame / S.durationInFrames;

  return (
    <SceneShell id="startHere">
      <Camera push={PUSH} drift={[0, -DRIFT]} from={-40} to={S.durationInFrames + 40} origin={[50, 0]}>
        <FloatingWindow
          width={WIDTH}
          height={HEIGHT}
          scale={SCALE}
          x={40}
          y={(HEIGHT * SCALE) / 2 - 540 + WINDOW_TOP}
          rotateX={mix(5, 2.5, turn)}
          rotateY={mix(-6, -2.5, turn)}
          chrome="none"
          theme="dark"
          contentStyle={{ maskImage: LIST_FADE, WebkitMaskImage: LIST_FADE }}
        >
          <GuidePage steps={steps} progress={progress} doneCount={<DoneCount frame={frame} ticks={START_HERE_CHECKS} />} />
          <Cursor points={cursorPath()} travel={30} size={18} showAt={START_HERE_CHECKS[0] - 36} hideAt={lastTick + 28} />
        </FloatingWindow>
      </Camera>
      {START_HERE_CHECKS.map((tick) => (
        <Sfx key={tick} kind="check" at={tick} volume={0.8} />
      ))}
    </SceneShell>
  );
}

/**
 * The done count rolls up one digit per tick, clipped to the label's own line. The new digit
 * arrives in emerald and cools to the label's colour, so the eye catches the count on the beat.
 */
function DoneCount({ frame, ticks }: { frame: number; ticks: number[] }) {
  const done = ticks.filter((t) => frame >= t).length;
  const last = done > 0 ? ticks[done - 1] : -Infinity;
  const t = done > 0 ? enter(frame, last, ROLL) : 1;
  const accent = done > 0 ? 1 - enter(frame, last + ROLL, 30, easeInOut) : 0;
  const line = "var(--text-meta--line-height)";
  return (
    <span className="inline-block overflow-hidden align-top tabular-nums" style={{ height: line }}>
      <span className="flex flex-col" style={{ transform: t < 1 ? `translateY(calc(${-t} * ${line}))` : undefined }}>
        {t < 1 && <span style={{ height: line, opacity: Math.max(0, 1 - 2.2 * t) }}>{done - 1}</span>}
        <span
          style={{
            height: line,
            opacity: t < 1 ? Math.max(0, (t - 0.35) / 0.65) : undefined,
            color: accent > 0 ? `color-mix(in srgb, var(--accent) ${accent * 100}%, var(--foreground))` : undefined,
          }}
        >
          {done}
        </span>
      </span>
    </span>
  );
}
