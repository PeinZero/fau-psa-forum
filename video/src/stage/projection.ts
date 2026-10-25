import { mix } from "../lib/motion";
import { HEIGHT, WIDTH } from "../lib/timeline";

/*
 * Window points in frame space, so a frame-space effect (the theme reveal, a cursor, the chat's
 * particles, a match cut between two windows) lands exactly on a point of a tilted window. The maths
 * mirrors the CSS of FloatingWindow and the chat window; change both together.
 */

export const PERSPECTIVE = 2400;
export const PERSPECTIVE_ORIGIN = { x: WIDTH * 0.5, y: HEIGHT * 0.45 };
export const PERSPECTIVE_ORIGIN_CSS = "50% 45%";

/** A window's placement: centre offset from the frame centre and depth (frame px), device scale and tilt. */
export type Plane = { x: number; y: number; z: number; scale: number; rotateX: number; rotateY: number };

/** A plane with the window's size in site px. */
export type WindowPose = Plane & { width: number; height: number };

export type Vec = { x: number; y: number };
type Vec3 = { x: number; y: number; z: number };

const rad = (deg: number) => (deg * Math.PI) / 180;

/** An in-plane offset from the window centre (site px) in frame px, before perspective. */
function toFrame(plane: Plane, offset: Vec): Vec3 {
  const a = rad(plane.rotateX);
  const b = rad(plane.rotateY);
  const sx = offset.x * plane.scale;
  const sy = offset.y * plane.scale;
  const y1 = { x: sx * Math.cos(b), y: sy, z: -sx * Math.sin(b) };
  return { x: y1.x, y: y1.y * Math.cos(a) - y1.z * Math.sin(a), z: y1.y * Math.sin(a) + y1.z * Math.cos(a) };
}

/** Frame position of window point (`px`, `py`), site px from the window's top-left. */
export function projectPoint(pose: WindowPose, px: number, py: number): Vec {
  const d = toFrame(pose, { x: px - pose.width / 2, y: py - pose.height / 2 });
  const X = WIDTH / 2 + pose.x + d.x;
  const Y = HEIGHT / 2 + pose.y + d.y;
  const k = PERSPECTIVE / (PERSPECTIVE - (pose.z + d.z));
  return { x: PERSPECTIVE_ORIGIN.x + (X - PERSPECTIVE_ORIGIN.x) * k, y: PERSPECTIVE_ORIGIN.y + (Y - PERSPECTIVE_ORIGIN.y) * k };
}

/** Frame-space bounding box of a window rect (site px), for clipping in the frame. */
export function projectRect(
  plane: Plane,
  size: { width: number; height: number },
  rect: { x: number; y: number; width: number; height: number },
): { left: number; top: number; right: number; bottom: number } {
  const pose = { ...plane, ...size };
  const corners = [
    projectPoint(pose, rect.x, rect.y),
    projectPoint(pose, rect.x + rect.width, rect.y),
    projectPoint(pose, rect.x, rect.y + rect.height),
    projectPoint(pose, rect.x + rect.width, rect.y + rect.height),
  ];
  return {
    left: Math.min(...corners.map((c) => c.x)),
    top: Math.min(...corners.map((c) => c.y)),
    right: Math.max(...corners.map((c) => c.x)),
    bottom: Math.max(...corners.map((c) => c.y)),
  };
}

/**
 * The placement of a second window on the same plane, whose centre sits `offset` site px from the
 * first window's centre (measured along the plane).
 */
export function shiftOnPlane(plane: Plane, offset: Vec): Plane {
  const d = toFrame(plane, offset);
  return { ...plane, x: plane.x + d.x, y: plane.y + d.y, z: plane.z + d.z };
}

export const mixPlane = (a: Plane, b: Plane, t: number): Plane => ({
  x: mix(a.x, b.x, t),
  y: mix(a.y, b.y, t),
  z: mix(a.z, b.z, t),
  scale: mix(a.scale, b.scale, t),
  rotateX: mix(a.rotateX, b.rotateX, t),
  rotateY: mix(a.rotateY, b.rotateY, t),
});

/** The same window rescaled so that `pivot` (site px from its top-left) stays where it is in the frame. */
export function scalePlaneAbout(plane: Plane, size: { width: number; height: number }, pivot: Vec, scale: number): Plane {
  const d = toFrame(plane, { x: pivot.x - size.width / 2, y: pivot.y - size.height / 2 });
  const k = 1 - scale / plane.scale;
  return { ...plane, scale, x: plane.x + d.x * k, y: plane.y + d.y * k, z: plane.z + d.z * k };
}
