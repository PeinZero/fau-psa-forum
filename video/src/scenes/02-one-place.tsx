import { useCurrentFrame } from "remotion";

import { enter } from "../lib/motion";
import { localBeat, scene } from "../lib/timeline";
import { GatherDot, HANDOVER, heroDotAt, heroPushAt, ParticleField } from "../screens/chat/particles";
import { HeroStage } from "../screens/hero";
import { SceneShell } from "../stage/scene-shell";

/*
 * The drop: the particles from the buried answer fill the pill's dot, which ignites on the
 * downbeat, and the hero lands one part per beat after it. Each entrance starts a few frames
 * before its beat so the beat falls on the visible arrival.
 */
const beatFrame = (n: number) => localBeat("onePlace", scene("onePlace").startBeat + n);
const LEAD = 4;
const LAND = 12;
/** The ignition's bloom and ring have faded by then. */
const BLOOM = 40;

const T = {
  ignite: beatFrame(0),
  pill: beatFrame(1),
  headline: beatFrame(2),
  sub: beatFrame(3),
  buttons: beatFrame(4),
  trust: beatFrame(5),
};

const land = (frame: number, at: number) => enter(frame, at - LEAD, LAND);

export function OnePlaceScene() {
  const frame = useCurrentFrame();
  const push = heroPushAt(frame);
  const pill = land(frame, T.pill);
  return (
    <SceneShell id="onePlace" enter="none" leave="handoff">
      <HeroStage
        push={push}
        build={{
          pill,
          dot: pill >= 1 ? 1 : 0,
          headline: land(frame, T.headline),
          sub: land(frame, T.sub),
          buttons: land(frame, T.buttons),
          // The three trust points follow each other on eighth notes.
          trust: enter(frame, T.trust - LEAD, 26),
        }}
      />
      {frame < T.ignite ? <ParticleField frame={frame + HANDOVER} /> : null}
      {frame < T.ignite + BLOOM ? <GatherDot frame={frame + HANDOVER} at={heroDotAt(push)} handover={pill >= 1 ? 1 : 0} /> : null}
    </SceneShell>
  );
}
