import { mix } from "../../lib/motion";
import type { Vec } from "../../stage/projection";

/** One look of the title: the result row's (15/24 regular) or the page's display title (30/38 semibold). */
export type TitleLook = { size: number; lineHeight: number; weight: 400 | 600; tracking: number };

export const ROW_TITLE_LOOK: TitleLook = { size: 15, lineHeight: 24, weight: 400, tracking: 0 };
export const DISPLAY_TITLE_LOOK: TitleLook = { size: 30, lineHeight: 38, weight: 600, tracking: -0.02 };

/**
 * A title travelling between two looks as one block: a single box moves from one line box corner to
 * the other and grows, its size, weight and tracking easing together (Reddit Sans is one variable
 * file). The result row sets the title on one line and the page on two, so the part after the break
 * fades off the end of the first line and fades in again as the second; it never travels on its own.
 */
export function MorphTitle({
  lines: [first, rest],
  from,
  to,
  fromLook,
  toLook,
  t,
  restOnFirst,
  restOnSecond,
  className,
}: {
  /** The title split where the destination wraps; the first part ends with its space. */
  lines: [string, string];
  /** Line box corners in the parent's px. */
  from: Vec;
  to: Vec;
  fromLook: TitleLook;
  toLook: TitleLook;
  /** Eased progress 0 → 1. */
  t: number;
  /** Opacity of the second part where the row has it: at the end of the first line. */
  restOnFirst: number;
  /** Opacity of the second part where the page has it: as the second line. */
  restOnSecond: number;
  className?: string;
}) {
  const weight = mix(fromLook.weight, toLook.weight, t);
  const lineHeight = mix(fromLook.lineHeight, toLook.lineHeight, t);
  return (
    <div
      className={className}
      style={{
        position: "absolute",
        left: mix(from.x, to.x, t),
        top: mix(from.y, to.y, t),
        fontSize: mix(fromLook.size, toLook.size, t),
        lineHeight: `${lineHeight}px`,
        letterSpacing: `${mix(fromLook.tracking, toLook.tracking, t)}em`,
        fontWeight: weight < 500 ? fromLook.weight : toLook.weight,
        fontVariationSettings: `"wght" ${weight}`,
        whiteSpace: "pre",
      }}
    >
      <div>
        {first}
        {restOnFirst > 0 ? <span style={{ opacity: restOnFirst }}>{rest}</span> : null}
      </div>
      <div style={{ opacity: restOnSecond }}>{rest}</div>
    </div>
  );
}
