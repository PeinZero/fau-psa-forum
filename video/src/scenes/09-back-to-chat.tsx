import { AbsoluteFill, useCurrentFrame } from "remotion";

import { easeInOut, enter } from "../lib/motion";
import { CALM_ITEMS, CALM_TYPING, landsAt, RP_LINK } from "../screens/chat/conversation";
import { beat, scene } from "../lib/timeline";
import { OG_ASPECT, prepare } from "../screens/chat/layout";
import { Phone, type PhonePose } from "../screens/chat/phone";
import { OgImage, QueriesScreen } from "../screens/chat/queries";
import { Camera } from "../stage/camera";
import { RimLight } from "../stage/floating-window";
import { PERSPECTIVE, PERSPECTIVE_ORIGIN_CSS } from "../stage/projection";
import { SceneShell } from "../stage/scene-shell";

/*
 * The breakdown: the same group, calm. The RP question comes once more and Bilal answers with
 * the thread. As the link lands, the phone makes room and its preview opens up beside it, big
 * enough to read on a phone. Messages land on the beats in lib/chat-beats.ts (the score pops).
 */
const CALM_CHAT = prepare(CALM_ITEMS);

const T = {
  reply: landsAt(CALM_ITEMS, "reply"),
  /** The preview lands one beat after the link. */
  card: landsAt(CALM_ITEMS, "reply") + beat(1),
};

function pose(frame: number): PhonePose {
  const aside = enter(frame, T.reply + 2, 22, easeInOut);
  return { x: 40 + 300 * aside, y: 6, z: 0, rotateX: 4, rotateY: -3 - 5 * aside, rotateZ: -2, scale: 1 };
}

const CARD = { width: 800, x: -372, y: -18, rotateY: 7, rotateX: 3, radius: 22 };

function PreviewCard({ frame }: { frame: number }) {
  const t = enter(frame, T.card - 6, 14);
  if (t <= 0) return null;
  const transform = [
    "translate(-50%, -50%)",
    `translate3d(${CARD.x + (1 - t) * 120}px, ${CARD.y + (1 - t) * 10}px, ${-(1 - t) * 160}px)`,
    `rotateX(${CARD.rotateX}deg)`,
    `rotateY(${CARD.rotateY}deg)`,
  ].join(" ");
  return (
    <AbsoluteFill style={{ perspective: PERSPECTIVE, perspectiveOrigin: PERSPECTIVE_ORIGIN_CSS, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: CARD.width,
          height: CARD.width * OG_ASPECT,
          transform,
          opacity: t,
          borderRadius: CARD.radius,
          boxShadow: "0 70px 130px -30px rgba(0,0,0,0.85), 0 26px 50px -26px rgba(0,0,0,0.9), 0 0 150px -30px rgba(16,185,129,0.32)",
        }}
      >
        <div style={{ position: "absolute", inset: 0, borderRadius: CARD.radius, overflow: "hidden" }}>
          <OgImage title={RP_LINK.title} footer={RP_LINK.footer} width={CARD.width} />
        </div>
        <RimLight radius={CARD.radius} strength={0.9} />
      </div>
    </AbsoluteFill>
  );
}

export function BackToChatScene() {
  const frame = useCurrentFrame();
  return (
    <SceneShell id="backToChat">
      <Camera push={0.04} from={0} to={scene("backToChat").durationInFrames} origin={[50, 50]}>
        <Phone pose={pose(frame)} halo={1}>
          <QueriesScreen
            frame={frame}
            chat={CALM_CHAT}
            typing={CALM_TYPING}
            clock="18:40"
            tinted={{ id: "reply", tint: 0.55 * enter(frame, T.reply, 30) }}
          />
        </Phone>
        <PreviewCard frame={frame} />
      </Camera>
    </SceneShell>
  );
}
