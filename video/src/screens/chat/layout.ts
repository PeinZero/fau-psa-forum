import { enter } from "../../lib/motion.ts";
import type { ChatItem, ChatMessage, MessageItem } from "./conversation.ts";

/*
 * The group chat is laid out in screen px of the phone (one screen px is one frame px before the
 * camera push). Message text is set large, like a phone on its "large" font setting, so every
 * bubble still reads at 28 px or more when the film plays on a phone.
 */

export const PHONE = { width: 512, height: 984, radius: 76, bezel: 12 };
export const SCREEN = { width: PHONE.width - 2 * PHONE.bezel, height: PHONE.height - 2 * PHONE.bezel, radius: 64 };

export const UI = {
  statusBar: 46,
  header: 98,
  composer: 84,
  navBar: 22,
  /** Space above the first item and below the newest one. */
  topPad: 14,
  bottomPad: 16,
  gap: 12,
  chip: 40,
  divider: 44,
};

export const AREA = {
  top: UI.statusBar + UI.header,
  bottom: SCREEN.height - UI.navBar - UI.composer,
};
export const AREA_HEIGHT = AREA.bottom - AREA.top;

export const FONT_FAMILY = '"Roboto", "Noto Color Emoji", sans-serif';

export const BUBBLE = {
  x: 22,
  /** Widest a line of text may run. */
  maxText: 356,
  padX: 13,
  padTop: 7,
  padBottom: 9,
  name: 32,
  nameSize: 23,
  phoneSize: 20,
  text: 30,
  line: 39,
  timeSize: 18,
  /** Room the time needs at the end of the last line. */
  timeRoom: 64,
  /** The time drops to its own line when the last line is too long. */
  timeLine: 24,
  radius: 14,
};

export const QUOTE = { padY: 8, bar: 5, padX: 14, size: 22, line: 28, marginTop: 2, marginBottom: 6, maxLines: 2 };

/** The reaction pill hangs below the bubble and pushes the next message down by this much. */
export const REACTION = { height: 40, overhang: 30 };

export const LINK = {
  width: 404,
  inset: 5,
  titleSize: 25,
  titleLine: 31,
  titleLines: 2,
  descSize: 20,
  descLine: 26,
  domainSize: 19,
  domainLine: 25,
  textPad: [10, 14, 12] as const,
  urlGap: 8,
  urlSize: 27,
  urlLine: 35,
  /** The time under the URL tucks into the bubble's bottom padding. */
  timeLine: 18,
};
/** Open Graph images are 1200 × 630. */
export const OG_ASPECT = 630 / 1200;
export const LINK_IMAGE = { width: LINK.width - 2 * LINK.inset, height: (LINK.width - 2 * LINK.inset) * OG_ASPECT };

/*
 * Roboto's advance widths (em) for the characters the chat uses, so lines can be broken ahead of
 * the render and every bubble's height is known exactly.
 */
const ADVANCE: Record<string, number> = {
  a: 0.544, b: 0.561, c: 0.523, d: 0.563, e: 0.529, f: 0.347, g: 0.561, h: 0.551, i: 0.243, j: 0.239,
  k: 0.495, l: 0.243, m: 0.876, n: 0.552, o: 0.57, p: 0.561, q: 0.567, r: 0.338, s: 0.516, t: 0.327,
  u: 0.551, v: 0.484, w: 0.751, x: 0.496, y: 0.473, z: 0.496,
  " ": 0.248, ".": 0.263, ",": 0.196, "?": 0.473, "!": 0.257, '"': 0.32, "+": 0.567, "-": 0.276, "/": 0.412,
  ":": 0.242, "(": 0.342, ")": 0.348, "•": 0.34, "~": 0.68, "…": 0.79, "§": 0.6, "&": 0.62,
};

function charWidth(ch: string): number {
  const known = ADVANCE[ch];
  if (known !== undefined) return known;
  if (/[A-Z]/.test(ch)) return 0.65;
  if (/[0-9]/.test(ch)) return 0.562;
  if ((ch.codePointAt(0) ?? 0) > 0x2000) return 1.22;
  return 0.55;
}

function textWidth(text: string, size: number): number {
  let w = 0;
  for (const ch of Array.from(text)) w += charWidth(ch);
  return w * size;
}

/** Greedy word wrap, the way the messenger breaks a message. */
export function wrapWords(text: string, size: number, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (line && textWidth(next, size) > max) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** A URL breaks anywhere. */
function wrapChars(text: string, size: number, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const ch of Array.from(text)) {
    if (line && textWidth(line + ch, size) > max) {
      lines.push(line);
      line = ch;
    } else {
      line += ch;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** At most `count` lines, the last one cut with an ellipsis. */
function clampLines(lines: string[], count: number, size: number, max: number): string[] {
  if (lines.length <= count) return lines;
  let last = `${lines[count - 1]} ${lines[count]}`;
  while (last.length > 1 && textWidth(`${last}…`, size) > max) last = last.slice(0, -1);
  return [...lines.slice(0, count - 1), `${last.trimEnd()}…`];
}

export type MessageLayout = {
  lines: string[];
  quote?: { sender: ChatMessage["sender"]; lines: string[] };
  /** The time sits on its own line under the text. */
  timeOwnLine: boolean;
  /** Bubble height without reactions. */
  height: number;
  /** Rough bubble width, for placing effects on it. */
  width: number;
  link?: { titleLines: string[]; urlLines: string[]; cardHeight: number };
};

export function quoteHeight(lines: number): number {
  return 2 * QUOTE.padY + QUOTE.line * (1 + lines);
}

function layoutMessage(m: ChatMessage, byId: Map<string, ChatMessage>): MessageLayout {
  const replied = m.replyTo ? byId.get(m.replyTo) : undefined;
  const textMax = m.link ? LINK.width - 2 * BUBBLE.padX : BUBBLE.maxText;
  const quoteMax = textMax - QUOTE.bar - 2 * QUOTE.padX - 4;
  const quote = replied
    ? { sender: replied.sender, lines: clampLines(wrapWords(replied.text, QUOTE.size, quoteMax), QUOTE.maxLines, QUOTE.size, quoteMax) }
    : undefined;
  const quoteBlock = quote ? QUOTE.marginTop + quoteHeight(quote.lines.length) + QUOTE.marginBottom : 0;

  if (m.link) {
    const [padTop, padX, padBottom] = LINK.textPad;
    const titleMax = LINK_IMAGE.width - 2 * padX;
    const titleLines = clampLines(wrapWords(m.link.title, LINK.titleSize, titleMax), LINK.titleLines, LINK.titleSize, titleMax);
    const urlLines = wrapChars(m.text, LINK.urlSize, textMax);
    const cardHeight = LINK_IMAGE.height + padTop + titleLines.length * LINK.titleLine + LINK.descLine + LINK.domainLine + padBottom;
    const height =
      BUBBLE.padTop + BUBBLE.name + quoteBlock + cardHeight + LINK.urlGap + urlLines.length * LINK.urlLine + LINK.timeLine + BUBBLE.padBottom;
    return { lines: [], quote, timeOwnLine: true, height, width: LINK.width, link: { titleLines, urlLines, cardHeight } };
  }

  const lines = wrapWords(m.text, BUBBLE.text, BUBBLE.maxText);
  const last = lines[lines.length - 1] ?? "";
  const timeOwnLine = textWidth(last, BUBBLE.text) + BUBBLE.timeRoom > BUBBLE.maxText;
  const height = BUBBLE.padTop + BUBBLE.name + quoteBlock + lines.length * BUBBLE.line + (timeOwnLine ? BUBBLE.timeLine : 0) + BUBBLE.padBottom;
  const nameWidth =
    textWidth(m.sender.phone ? `~ ${m.sender.name}` : m.sender.name, BUBBLE.nameSize) +
    (m.sender.phone ? 14 + textWidth(m.sender.phone, BUBBLE.phoneSize) : 0);
  const textWidthMax = Math.max(...lines.map((l) => textWidth(l, BUBBLE.text)), textWidth(last, BUBBLE.text) + BUBBLE.timeRoom);
  const width = 2 * BUBBLE.padX + Math.min(BUBBLE.maxText, Math.max(nameWidth, textWidthMax, quote ? 200 : 0));
  return { lines, quote, timeOwnLine, height, width };
}

/** A bubble starts to land two frames before its beat, so the beat falls on the visible arrival. */
export const LAND_LEAD = 2;
/** The list makes room for a new bubble over this many frames (eased, so fast arrivals overlap into one scroll). */
const PUSH = 12;
export const POP = 9;

export type Placed = {
  item: ChatItem;
  /** Top edge in px from the top of the messages area. */
  top: number;
  /** Bubble height (without the reaction pill). */
  height: number;
  /** 0 → 1 as the bubble lands. */
  pop: number;
  layout?: MessageLayout;
};

export type ChatLayout = { items: ChatItem[]; layouts: Map<string, MessageLayout> };

export function prepare(items: ChatItem[]): ChatLayout {
  const byId = new Map<string, ChatMessage>();
  for (const it of items) if (it.kind === "message") byId.set(it.id, it);
  const layouts = new Map<string, MessageLayout>();
  for (const it of items) if (it.kind === "message") layouts.set(it.id, layoutMessage(it, byId));
  return { items, layouts };
}

function arrival(item: ChatItem, frame: number): number {
  return item.kind === "message" ? enter(frame, item.at - LAND_LEAD, PUSH) : 1;
}

function reactionRoom(item: ChatItem, frame: number): number {
  if (item.kind !== "message" || !item.reactions?.length) return 0;
  return REACTION.overhang * enter(frame, item.reactions[0].at - LAND_LEAD, POP);
}

function baseHeight(item: ChatItem, chat: ChatLayout): number {
  if (item.kind === "chip") return UI.chip;
  if (item.kind === "divider") return UI.divider;
  return chat.layouts.get(item.id)?.height ?? 0;
}

/**
 * Where every item sits at `frame`: new bubbles push the list up as they land, and the list only
 * starts to scroll once it fills the screen (a soft knee, so the first scroll eases in too).
 */
export function stackAt(chat: ChatLayout, frame: number): Placed[] {
  const rows = chat.items.map((item) => {
    const height = baseHeight(item, chat);
    const a = arrival(item, frame);
    return { item, height, a, room: (height + reactionRoom(item, frame) + UI.gap) * a };
  });
  const content = UI.topPad + rows.reduce((sum, r) => sum + r.room, 0) - UI.gap + UI.bottomPad;
  const over = content - AREA_HEIGHT;
  const knee = 60;
  const scroll = (over + Math.sqrt(over * over + knee * knee)) / 2;
  let y = UI.topPad - scroll;
  return rows.map((r) => {
    const placed: Placed = {
      item: r.item,
      top: y,
      height: r.height,
      pop: r.item.kind === "message" ? enter(frame, r.item.at - LAND_LEAD, POP) : 1,
      layout: r.item.kind === "message" ? chat.layouts.get(r.item.id) : undefined,
    };
    y += r.room;
    return placed;
  });
}

/** The messages that have landed by `frame`, oldest first. */
export function landedBy(items: ChatItem[], frame: number): ChatMessage[] {
  return items.filter((it): it is MessageItem => it.kind === "message" && it.at - LAND_LEAD <= frame);
}

/** First frame on which message `id` has scrolled completely out under the header. */
export function exitFrame(chat: ChatLayout, id: string, from: number, to: number): number {
  for (let f = from; f <= to; f++) {
    const row = stackAt(chat, f).find((p) => p.item.id === id);
    if (row && row.top + row.height <= 0) return f;
  }
  return to;
}
