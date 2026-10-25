import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";

import { easeInOut, enter } from "../../lib/motion";
import { HEIGHT, WIDTH } from "../../lib/timeline";
import { RimLight } from "../../stage/floating-window";
import { PERSPECTIVE, PERSPECTIVE_ORIGIN, PERSPECTIVE_ORIGIN_CSS, type Vec } from "../../stage/projection";
import { PHONE, SCREEN } from "./layout";
import { PALETTE } from "./queries";

/** Where the phone floats: centre offset from the frame centre and depth (frame px), tilt in degrees. */
export type PhonePose = { x: number; y: number; z: number; rotateX: number; rotateY: number; rotateZ: number; scale: number };

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Frame position of a point on the phone's screen (screen px from its top-left), before the camera. */
export function projectScreenPoint(pose: PhonePose, sx: number, sy: number): Vec {
  const u = (PHONE.bezel + sx - PHONE.width / 2) * pose.scale;
  const v = (PHONE.bezel + sy - PHONE.height / 2) * pose.scale;
  const a = rad(pose.rotateX);
  const b = rad(pose.rotateY);
  const c = rad(pose.rotateZ);
  // rotateY, then rotateX, then rotateZ: the order CSS applies `rotateZ() rotateX() rotateY()` to a point.
  const x1 = u * Math.cos(b);
  const z1 = -u * Math.sin(b);
  const y2 = v * Math.cos(a) - z1 * Math.sin(a);
  const z2 = v * Math.sin(a) + z1 * Math.cos(a);
  const x3 = x1 * Math.cos(c) - y2 * Math.sin(c);
  const y3 = x1 * Math.sin(c) + y2 * Math.cos(c);
  const X = WIDTH / 2 + pose.x + x3;
  const Y = HEIGHT / 2 + pose.y + y3;
  const k = PERSPECTIVE / (PERSPECTIVE - (pose.z + z2));
  return { x: PERSPECTIVE_ORIGIN.x + (X - PERSPECTIVE_ORIGIN.x) * k, y: PERSPECTIVE_ORIGIN.y + (Y - PERSPECTIVE_ORIGIN.y) * k };
}

/** The props of a `<Camera>` move, so frame-space effects can follow the same push. */
export type CameraMove = { push: number; from: number; to: number; origin: [number, number] };

export function cameraPoint(cam: CameraMove, frame: number, p: Vec): Vec {
  const t = enter(frame, cam.from, Math.max(1, cam.to - cam.from), easeInOut);
  const s = 1 + cam.push * t;
  const ox = (cam.origin[0] / 100) * WIDTH;
  const oy = (cam.origin[1] / 100) * HEIGHT;
  return { x: ox + (p.x - ox) * s, y: oy + (p.y - oy) * s };
}

type PhoneProps = {
  pose: PhonePose;
  opacity?: number;
  /** Depth of field for when the phone is the background layer. */
  blur?: number;
  /** Emerald light around the phone (0–1), so a lone phone does not sit in black. */
  halo?: number;
  /** The screen's contents, SCREEN.width × SCREEN.height. */
  children: ReactNode;
};

/** A generic phone: neutral graphite body, thin bezel and a hole-punch camera, no brand. */
export function Phone({ pose, opacity = 1, blur = 0, halo = 0.3, children }: PhoneProps) {
  const transform = [
    "translate(-50%, -50%)",
    `translate3d(${pose.x}px, ${pose.y}px, ${pose.z}px)`,
    `rotateZ(${pose.rotateZ}deg)`,
    `rotateX(${pose.rotateX}deg)`,
    `rotateY(${pose.rotateY}deg)`,
    `scale(${pose.scale})`,
  ].join(" ");
  return (
    <AbsoluteFill style={{ perspective: PERSPECTIVE, perspectiveOrigin: PERSPECTIVE_ORIGIN_CSS, pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: PHONE.width,
          height: PHONE.height,
          transform,
          opacity,
          filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
        }}
      >
        <SideButtons />
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: PHONE.radius,
            background: "linear-gradient(155deg, #34373c 0%, #17181b 22%, #101113 60%, #26282c 100%)",
            boxShadow: [
              "0 80px 140px -30px rgba(0,0,0,0.85)",
              "0 30px 60px -30px rgba(0,0,0,0.9)",
              `0 0 160px -30px rgba(16,185,129,${0.28 + 0.2 * halo})`,
              `0 0 420px 60px rgba(16,185,129,${0.1 * halo})`,
              "inset 0 0 0 1.5px rgba(255,255,255,0.10)",
              "inset 0 0 0 4px rgba(0,0,0,0.6)",
            ].join(", "),
          }}
        />
        <div
          style={{
            position: "absolute",
            left: PHONE.bezel,
            top: PHONE.bezel,
            width: SCREEN.width,
            height: SCREEN.height,
            borderRadius: SCREEN.radius,
            overflow: "hidden",
            background: PALETTE.bg,
          }}
        >
          {children}
        </div>
        <RimLight radius={PHONE.radius} strength={0.75} />
      </div>
    </AbsoluteFill>
  );
}

function SideButtons() {
  const button = (top: number, height: number) => (
    <div
      style={{
        position: "absolute",
        right: -3,
        top,
        width: 6,
        height,
        borderRadius: 3,
        background: "linear-gradient(90deg, #1a1b1e, #3a3d42)",
      }}
    />
  );
  return (
    <>
      {button(214, 112)}
      {button(360, 74)}
    </>
  );
}
