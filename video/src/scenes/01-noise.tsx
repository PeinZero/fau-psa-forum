import { useCurrentFrame } from "remotion";

import { lines } from "../lines/noise";
import { BURIED_ID, NOISE_TYPING } from "../screens/chat/conversation";
import { GhostBubbles } from "../screens/chat/ghosts";
import { landedBy } from "../screens/chat/layout";
import { BURIED_X, buriedGlow, buriedTint, NOISE_CAMERA, NOISE_CHAT, noisePose, phoneLook } from "../screens/chat/noise";
import { HANDOVER, ParticleField } from "../screens/chat/particles";
import { Phone } from "../screens/chat/phone";
import { QueriesScreen } from "../screens/chat/queries";
import { Camera } from "../stage/camera";
import { OnScreenLine } from "../stage/on-screen-line";
import { SceneShell } from "../stage/scene-shell";

/*
 * The "Queries" group: the same questions land on the beat, faster and faster, until Bilal's
 * answer is pushed out under the header and someone asks it again. The score plays a pop on
 * every message (lib/chat-beats.ts). The story lines sit beside the phone, never over a bubble.
 */
const LINE = { x: 486, y: 520, width: 760 };

/** The divider says 12 unread; the badge climbs from there with every message that lands. */
function unreadAt(frame: number): number {
  return 11 + Math.max(1, landedBy(NOISE_CHAT.items, frame).length);
}

export function NoiseScene() {
  const frame = useCurrentFrame();
  const look = phoneLook(frame);
  return (
    <SceneShell id="noise" leave="none">
      <Camera {...NOISE_CAMERA}>
        <GhostBubbles frame={frame} fade={look.opacity} />
        <Phone pose={noisePose(frame)} opacity={look.opacity} blur={look.blur}>
          <QueriesScreen
            frame={frame}
            chat={NOISE_CHAT}
            typing={NOISE_TYPING}
            unread={unreadAt(frame)}
            tinted={{ id: BURIED_ID, tint: buriedTint(frame) }}
            glow={{ x: BURIED_X, strength: buriedGlow(frame) }}
          />
        </Phone>
      </Camera>
      {frame < HANDOVER ? <ParticleField frame={frame} /> : null}
      {lines.map((l) => (
        // Broken after the comma, so neither line ends on "the".
        <OnScreenLine
          key={l.text}
          {...l}
          text={l.text.replace(", ", ",\n")}
          y={LINE.y}
          maxWidth={LINE.width}
          style={{ left: LINE.x, whiteSpace: "pre-line" }}
        />
      ))}
    </SceneShell>
  );
}
