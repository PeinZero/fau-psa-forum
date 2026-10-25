/**
 * Items of a wrapping meta line. Each carries its separator in front; the line sits in an
 * `overflow-hidden` frame shifted left by the same amount (`metaLine`), so the separator of
 * whichever item starts a line is clipped and no line ever begins with "·".
 */
export const metaFrame = "min-w-0 overflow-hidden";
export const metaLine = "-ml-4 flex flex-wrap items-center gap-y-1";
export const metaItem =
  "relative inline-flex items-center pl-4 before:absolute before:left-1.5 before:text-subtle before:content-['·']";
/** Same offset without a separator, for badges that follow an item. */
export const metaPlainItem = "inline-flex items-center pl-2";
