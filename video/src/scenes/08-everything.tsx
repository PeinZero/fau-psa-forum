import type { CSSProperties } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

import { Sfx } from "../audio/sfx";
import { easeOut, enter } from "../lib/motion";
import { HEIGHT, localBeat, scene, WIDTH } from "../lib/timeline";
import { announcement } from "../screens/demo-data";
import { AnnouncementCard, ANNOUNCEMENT_CARD } from "../screens/montage/announcement-card";
import { BROWSE_CARD, BrowseControlsCard, type BrowseCity, type BrowseSort } from "../screens/montage/browse-cards";
import { HEADER_CARD, HeaderCard } from "../screens/montage/header-card";
import { LightStage } from "../screens/montage/light-stage";
import { PeakGlow } from "../screens/montage/peak-glow";
import { Phone, PHONE } from "../screens/montage/phone";
import { PROFILE_CARD, ProfileCard } from "../screens/montage/profile-card";
import { SAVED_CARD, SavedCard } from "../screens/montage/saved-card";
import { SHORTCUTS_CARD, ShortcutsCard } from "../screens/montage/shortcuts-card";
import type { ThemeChoice } from "../screens/site-header";
import { ThreadPage } from "../screens/thread-page";
import { Backdrop } from "../stage/backdrop";
import { Cursor, type CursorPoint } from "../stage/cursor";
import { FloatingWindow, type Theme } from "../stage/floating-window";
import { projectPoint } from "../stage/projection";
import { SceneShell } from "../stage/scene-shell";

/*
 * Everything else, the musical peak: feature cards land on the beat, one every two beats, into a wall
 * that fills the frame while the camera drifts across it. On a bar line the theme toggle turns the
 * whole frame light as a circle growing out of it; on the next bar line the Anmeldung thread lands on
 * a phone and a second click turns everything dark again.
 */

const S = scene("everything");
/** Local frame of the scene's beat `k`: 0 is the cut, 16 the cut-out. */
const B = (k: number) => localBeat("everything", S.startBeat + k);

export const EVERYTHING_TIMING = {
  /** Beat frames the cards land on: a pair on the cut, then one every two beats. */
  land: {
    announcement: B(0),
    profile: B(0),
    saved: B(2),
    header: B(4),
    browse: B(6),
    shortcuts: B(10),
    phone: B(12),
  },
  /** Segment switches in the browse controls, on beats between the landings. */
  sortNew: B(7),
  cityErlangen: B(11),
  /** Toggle clicks on bar lines: system → light, then light → dark as the phone lands. */
  toLight: B(8),
  toDark: B(12),
  /** The circle covers the frame in 1 s. */
  reveal: 30,
};
const T = EVERYTHING_TIMING;

/** One drift for the whole scene, linear so the camera never settles. */
const CAMERA = { drift: [-120, -30] as [number, number], push: 0.04 };
const cameraProgress = (frame: number) => frame / (S.durationInFrames - 1);
const cameraScale = (frame: number) => 1 + CAMERA.push * cameraProgress(frame);
/** Frame on which every card sits exactly at its `at`: the finished wall, just before the phone. */
const REF = B(11);

/** A card lands from closer to the camera, starting just before its beat so the arrival reads on it. */
const LANDING = { lead: 3, duration: 12, fade: 3, rise: 48, z: 220, tilt: 4 };
/** The phone rises in from below the frame, opaque almost at once so it never ghosts over the wall. */
const PHONE_LANDING = { lead: 4, duration: 15, fade: 3, rise: 360, z: -60, tilt: 4 };
/** Once the phone is down, the cards it covers fall back into a soft, dimmer background layer. */
const RECEDE = { duration: 15, blur: 3, dim: 0.55 };

type CardId = "announcement" | "profile" | "browse" | "header" | "saved" | "shortcuts" | "phone";

type CardSpec = {
  id: CardId;
  size: { width: number; height: number; radius?: number };
  /** Device scale (frame px per site px): every text that matters is at least 28 px. */
  scale: number;
  /** Centre offset from the frame centre on frame REF, before the push (frame px). */
  at: [number, number];
  z: number;
  /** Share of the camera drift: below 1 is further back. */
  depth: number;
  tilt: [number, number];
  land: number;
  /** Sits behind the phone once it lands. */
  behindPhone?: boolean;
};

const CARDS: CardSpec[] = [
  { id: "profile", size: PROFILE_CARD, scale: 2.4, at: [468, -288], z: 0, depth: 0.95, tilt: [4, -4], land: T.land.profile },
  { id: "announcement", size: ANNOUNCEMENT_CARD, scale: 2.35, at: [-445, 362], z: 10, depth: 1.05, tilt: [3, 4], land: T.land.announcement, behindPhone: true },
  { id: "saved", size: SAVED_CARD, scale: 1.7, at: [-472, -272], z: -20, depth: 0.95, tilt: [4, 4], land: T.land.saved, behindPhone: true },
  { id: "header", size: HEADER_CARD, scale: 1.6, at: [538, 85], z: 0, depth: 1, tilt: [3, -4], land: T.land.header },
  { id: "browse", size: BROWSE_CARD, scale: 2.2, at: [-380, 85], z: 0, depth: 1, tilt: [3, 4], land: T.land.browse, behindPhone: true },
  { id: "shortcuts", size: SHORTCUTS_CARD, scale: 2.0, at: [465, 400], z: 20, depth: 1.05, tilt: [3, -4], land: T.land.shortcuts },
  { id: "phone", size: PHONE, scale: 1.6, at: [-470, 230], z: 120, depth: 1.15, tilt: [4, 6], land: T.land.phone },
];

const HEADER = CARDS.find((c) => c.id === "header") as CardSpec;

type Pose = { x: number; y: number; z: number; rotateX: number; rotateY: number; blur: number; opacity: number };

const landingOf = (card: CardSpec) => (card.id === "phone" ? PHONE_LANDING : LANDING);

function poseOf(card: CardSpec, frame: number): Pose {
  const landing = landingOf(card);
  const t = enter(frame, card.land - landing.lead, landing.duration, easeOut);
  const drift = (cameraProgress(frame) - cameraProgress(REF)) * card.depth;
  const recede = card.behindPhone ? enter(frame, T.land.phone, RECEDE.duration, easeOut) : 0;
  return {
    x: card.at[0] + CAMERA.drift[0] * drift,
    y: card.at[1] + CAMERA.drift[1] * drift + landing.rise * (1 - t),
    z: card.z + landing.z * (1 - t),
    rotateX: card.tilt[0] + landing.tilt * (1 - t),
    rotateY: card.tilt[1],
    blur: RECEDE.blur * recede,
    opacity: enter(frame, card.land - landing.lead, landing.fade, (v) => v) * (1 - RECEDE.dim * recede),
  };
}

/** Frame position of a window point (site px from its top-left), through its pose and the push. */
function framePoint(card: CardSpec, frame: number, px: number, py: number) {
  const local = projectPoint({ ...card.size, scale: card.scale, ...poseOf(card, frame) }, px, py);
  const s = cameraScale(frame);
  return { x: WIDTH / 2 + s * (local.x - WIDTH / 2), y: HEIGHT / 2 + s * (local.y - HEIGHT / 2) };
}

const toggleAt = (frame: number) => framePoint(HEADER, frame, HEADER_CARD.toggle.x, HEADER_CARD.toggle.y);

function themeChoiceAt(frame: number): ThemeChoice {
  if (frame < T.toLight) return "system";
  return frame < T.toDark ? "light" : "dark";
}

const sortAt = (frame: number): BrowseSort => (frame < T.sortNew ? "hot" : "new");
const cityAt = (frame: number): BrowseCity => (frame < T.cityErlangen ? "all" : "erlangen");

function CardContent({ id, frame }: { id: CardId; frame: number }) {
  switch (id) {
    case "announcement":
      return <AnnouncementCard />;
    case "profile":
      return <ProfileCard />;
    case "browse":
      return <BrowseControlsCard sort={sortAt(frame)} city={cityAt(frame)} />;
    case "header": {
      const hover = [T.toLight, T.toDark].some((click) => frame >= click - 5 && frame < click + 14);
      return <HeaderCard themeChoice={themeChoiceAt(frame)} hoverToggle={hover} />;
    }
    case "saved":
      return <SavedCard />;
    case "shortcuts":
      return <ShortcutsCard />;
    case "phone":
      return (
        <Phone>
          <ThreadPage device="phone" header={{ announcement, bellCount: 0 }} voted score={25} />
        </Phone>
      );
  }
}

function CardWindow({ card, frame, theme }: { card: CardSpec; frame: number; theme: Theme }) {
  if (frame < card.land - landingOf(card).lead) return null;
  const pose = poseOf(card, frame);
  return (
    <FloatingWindow
      width={card.size.width}
      height={card.size.height}
      scale={card.scale}
      x={pose.x}
      y={pose.y}
      z={pose.z}
      rotateX={pose.rotateX}
      rotateY={pose.rotateY}
      blur={pose.blur}
      opacity={pose.opacity}
      radius={card.size.radius ?? 14}
      rim={1}
      chrome="none"
      theme={theme}
    >
      <CardContent id={card.id} frame={frame} />
    </FloatingWindow>
  );
}

/** The wall in one theme; cards stack in landing order, the phone on top. */
function Wall({ frame, theme }: { frame: number; theme: Theme }) {
  return (
    <AbsoluteFill style={{ transform: `scale(${cameraScale(frame)})` }}>
      {CARDS.map((card) => (
        <CardWindow key={card.id} card={card} frame={frame} theme={theme} />
      ))}
    </AbsoluteFill>
  );
}

/** The circle has covered the frame once it reaches the corner furthest from where it started. */
function coverRadius(start: number): number {
  const c = toggleAt(start);
  return Math.max(...[0, WIDTH].flatMap((x) => [0, HEIGHT].map((y) => Math.hypot(x - c.x, y - c.y)))) + 24;
}

/** The new theme as a circle growing out of the toggle (frame space, soft by a pixel at the edge). */
function circleMask(frame: number, start: number): { covered: boolean; radius: number; style: CSSProperties } {
  // Squared so the edge blooms out of the toggle instead of popping in the first frame.
  const t = enter(frame, start, T.reveal, easeOut);
  const radius = coverRadius(start) * t * t;
  const c = toggleAt(frame);
  const mask = `radial-gradient(circle at ${c.x}px ${c.y}px, #000 ${Math.max(0, radius - 0.75)}px, transparent ${radius + 0.75}px)`;
  return { covered: t >= 1, radius, style: { maskImage: mask, WebkitMaskImage: mask } };
}

/* Waypoints relative to the toggle, in frame px: in from below, click, step aside, back, click, away. */
function cursorPoints(): CursorPoint[] {
  return [
    { frame: T.toLight - 22, x: 150, y: 210 },
    { frame: T.toLight, x: 1, y: 2, click: true },
    { frame: T.toLight + 18, x: 46, y: 58 },
    { frame: T.toDark, x: 1, y: 2, click: true },
    { frame: T.toDark + 22, x: 220, y: 120 },
  ];
}

function ToggleCursor({ frame }: { frame: number }) {
  const c = toggleAt(frame);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: c.x, top: c.y }}>
        <Cursor points={cursorPoints()} size={40} travel={20} showAt={T.toLight - 24} hideAt={T.toDark + 14} />
      </div>
    </AbsoluteFill>
  );
}

export function EverythingScene() {
  const frame = useCurrentFrame();
  const light = circleMask(frame, T.toLight);
  const dark = circleMask(frame, T.toDark);

  const showBase = !light.covered || dark.covered;
  const showLight = light.radius > 0 && !dark.covered;
  const showDarkTop = dark.radius > 0 && !dark.covered;

  return (
    <SceneShell id="everything">
      {showBase && (
        <>
          <PeakGlow />
          <Wall frame={frame} theme="dark" />
        </>
      )}
      {showLight && (
        <AbsoluteFill style={light.covered ? undefined : light.style}>
          <LightStage />
          <Wall frame={frame} theme="light" />
        </AbsoluteFill>
      )}
      {showDarkTop && (
        <AbsoluteFill style={dark.style}>
          <Backdrop offset={S.from} />
          <PeakGlow />
          <Wall frame={frame} theme="dark" />
        </AbsoluteFill>
      )}
      <ToggleCursor frame={frame} />
      <Sfx kind="click" at={T.toLight} volume={0.8} />
      <Sfx kind="click" at={T.toDark} volume={0.8} />
    </SceneShell>
  );
}

/** Local frames the stage is fully light (for the score): reveal end to the second click. */
export const EVERYTHING_LIGHT_SPAN: [number, number] = [T.toLight + T.reveal, T.toDark];
