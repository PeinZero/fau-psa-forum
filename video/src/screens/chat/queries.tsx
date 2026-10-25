import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";
import { loadFont as loadRoboto } from "@remotion/google-fonts/Roboto";
import { ArrowLeft, Camera, ChevronsDown, Mic, Paperclip, Phone as PhoneIcon, Smile, Users, Video, Wifi } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { clamp01, enter, exit, mix } from "../../lib/motion";
import { type ChatItem, type ChatMessage, GROUP, type LinkPreview, type Sender, type Typing } from "./conversation";
import {
  AREA,
  AREA_HEIGHT,
  BUBBLE,
  type ChatLayout,
  FONT_FAMILY,
  LAND_LEAD,
  LINK,
  LINK_IMAGE,
  landedBy,
  type MessageLayout,
  type Placed,
  POP,
  QUOTE,
  quoteHeight,
  REACTION,
  SCREEN,
  stackAt,
  UI,
} from "./layout";
import { DoodleWallpaper } from "./wallpaper";

// The messenger's own face is a system sans; Roboto stands in for it.
loadRoboto("normal", { weights: ["400", "500"], subsets: ["latin", "latin-ext"] });
// The site's Open Graph image is rendered by next/og, whose default face is Geist (one weight).
const { fontFamily: ogFont } = loadGeist("normal", { weights: ["400"], subsets: ["latin"] });

/** The familiar dark-mode messenger palette (a portrait of the problem, not the forum's UI). */
export const PALETTE = {
  bg: "#0b141a",
  bar: "#1f2c34",
  bubble: "#202c33",
  text: "#e9edef",
  meta: "#8696a0",
  icon: "#aebac1",
  chip: "#182229",
  quote: "#1a2329",
  preview: "#1a2329",
  link: "#53bdeb",
  green: "#00a884",
  onGreen: "#111b21",
};

type QueriesScreenProps = {
  frame: number;
  chat: ChatLayout;
  typing?: Typing[];
  /** Unread count on the scroll-down button; no button when undefined. */
  unread?: number;
  /** A bubble with the emerald tint of an answer (0–1). */
  tinted?: { id: string; tint: number };
  /** The buried answer's light under the header after it is gone: centre x (screen px) and strength. */
  glow?: { x: number; strength: number };
  /** The status bar clock before the first message lands. */
  clock?: string;
};

/** The "Queries" group on the phone's screen (SCREEN.width × SCREEN.height). */
export function QueriesScreen({ frame, chat, typing = [], unread, tinted, glow, clock: startClock = "09:10" }: QueriesScreenProps) {
  const placed = stackAt(chat, frame);
  const clock = latestTime(chat.items, frame, startClock);
  return (
    <div style={{ position: "absolute", inset: 0, background: PALETTE.bg, fontFamily: FONT_FAMILY, color: PALETTE.text }}>
      <DoodleWallpaper width={SCREEN.width} height={SCREEN.height} opacity={0.075} />
      <div style={{ position: "absolute", left: 0, right: 0, top: AREA.top, height: AREA_HEIGHT, overflow: "hidden" }}>
        {placed.map((p) => (
          <Row key={p.item.id} placed={p} frame={frame} tint={tinted && tinted.id === p.item.id ? tinted.tint : 0} />
        ))}
      </div>
      {glow && glow.strength > 0.001 ? <BuriedGlow x={glow.x} strength={glow.strength} /> : null}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, background: PALETTE.bar }}>
        <StatusBar clock={clock} />
        <Header subtitle={subtitleAt(typing, frame)} />
      </div>
      {unread !== undefined ? <ScrollDownButton count={unread} frame={frame} chat={chat} /> : null}
      <Composer />
      <NavBar />
    </div>
  );
}

/** The status bar clock runs with the chat: the day passes in a few seconds. */
function latestTime(items: ChatItem[], frame: number, start: string): string {
  return landedBy(items, frame).at(-1)?.time ?? start;
}

function subtitleAt(typing: Typing[], frame: number): { members: number; typing: string } {
  let t = 0;
  let name = typing[0]?.name ?? "";
  for (const w of typing) {
    const v = Math.min(enter(frame, w.from, 5), exit(frame, w.to, 5));
    if (v > t) {
      t = v;
      name = w.name;
    }
  }
  return { members: 1 - t, typing: t > 0 ? `${name} is typing…` : "" };
}

function StatusBar({ clock }: { clock: string }) {
  return (
    <div className="flex items-center justify-between" style={{ height: UI.statusBar, padding: "4px 30px 0 34px", position: "relative" }}>
      <span className="tabular" style={{ fontSize: 20, fontWeight: 500, color: PALETTE.text, letterSpacing: "0.01em" }}>
        {clock}
      </span>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 13,
          width: 18,
          height: 18,
          marginLeft: -9,
          borderRadius: "50%",
          background: "#050607",
          boxShadow: "0 0 0 2px rgba(255,255,255,0.05)",
        }}
      />
      <div className="flex items-center" style={{ gap: 9 }}>
        <SignalBars />
        <Wifi size={21} strokeWidth={2.4} color={PALETTE.text} />
        <Battery />
      </div>
    </div>
  );
}

function SignalBars() {
  return (
    <svg width={20} height={16} viewBox="0 0 20 16">
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={i * 5.2} y={12 - i * 3.6} width={3.6} height={4 + i * 3.6} rx={1} fill={PALETTE.text} />
      ))}
    </svg>
  );
}

function Battery() {
  return (
    <svg width={30} height={16} viewBox="0 0 30 16">
      <rect x={1} y={1.5} width={24} height={13} rx={3.5} fill="none" stroke={PALETTE.text} strokeOpacity={0.55} strokeWidth={1.6} />
      <rect x={3.5} y={4} width={15} height={8} rx={1.8} fill={PALETTE.text} />
      <rect x={26.5} y={5.5} width={2.2} height={5} rx={1} fill={PALETTE.text} fillOpacity={0.55} />
    </svg>
  );
}

function Header({ subtitle }: { subtitle: { members: number; typing: string } }) {
  return (
    <div className="flex items-center" style={{ height: UI.header, padding: "0 18px 0 8px", gap: 10 }}>
      <ArrowLeft size={28} strokeWidth={2} color={PALETTE.text} />
      <div
        className="flex shrink-0 items-center justify-center rounded-full"
        style={{ width: 52, height: 52, background: "#53636c" }}
      >
        <Users size={27} strokeWidth={2} color="#dfe5e7" />
      </div>
      <div className="min-w-0 flex-1" style={{ paddingLeft: 4 }}>
        <div style={{ fontSize: 29, lineHeight: "36px", fontWeight: 500, color: PALETTE.text }}>{GROUP.name}</div>
        <div style={{ position: "relative", height: 25, fontSize: 18, lineHeight: "25px", whiteSpace: "nowrap" }}>
          <span style={{ position: "absolute", left: 0, top: 0, color: PALETTE.meta, opacity: subtitle.members }}>{GROUP.members}</span>
          <span style={{ position: "absolute", left: 0, top: 0, color: PALETTE.green, opacity: 1 - subtitle.members }}>{subtitle.typing}</span>
        </div>
      </div>
      <div className="flex items-center" style={{ gap: 24 }}>
        <Video size={28} strokeWidth={1.9} color={PALETTE.icon} />
        <PhoneIcon size={24} strokeWidth={1.9} color={PALETTE.icon} />
      </div>
    </div>
  );
}

function Composer() {
  const bottom = UI.navBar;
  return (
    <div
      className="flex items-center"
      style={{ position: "absolute", left: 0, right: 0, bottom, height: UI.composer, padding: "0 10px", gap: 8 }}
    >
      <div
        className="flex flex-1 items-center"
        style={{ height: 60, borderRadius: 30, background: PALETTE.bar, padding: "0 18px", gap: 12 }}
      >
        <Smile size={27} strokeWidth={1.8} color={PALETTE.meta} />
        <span style={{ flex: 1, fontSize: 23, color: PALETTE.meta }}>Message</span>
        <Paperclip size={24} strokeWidth={1.8} color={PALETTE.meta} style={{ transform: "rotate(-45deg)" }} />
        <Camera size={25} strokeWidth={1.8} color={PALETTE.meta} />
      </div>
      <div className="flex shrink-0 items-center justify-center rounded-full" style={{ width: 60, height: 60, background: PALETTE.green }}>
        <Mic size={26} strokeWidth={2.1} color={PALETTE.onGreen} />
      </div>
    </div>
  );
}

function NavBar() {
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: UI.navBar }}>
      <div style={{ position: "absolute", left: "50%", top: 8, width: 136, height: 5, marginLeft: -68, borderRadius: 3, background: "rgba(233,237,239,0.55)" }} />
    </div>
  );
}

/** The round scroll-down button with its unread count; the count ticks up as each message lands. */
function ScrollDownButton({ count, frame, chat }: { count: number; frame: number; chat: ChatLayout }) {
  const last = [...chat.items].reverse().find((it) => it.kind === "message" && it.at - LAND_LEAD <= frame);
  const tick = last && last.kind === "message" ? exit(frame, last.at - LAND_LEAD, 10) : 0;
  return (
    <div style={{ position: "absolute", right: 16, top: AREA.bottom - 16 - 50, width: 50, height: 50 }}>
      <div
        className="flex items-center justify-center rounded-full"
        style={{ width: 50, height: 50, background: PALETTE.bubble, boxShadow: "0 2px 8px rgba(0,0,0,0.45)" }}
      >
        <ChevronsDown size={26} strokeWidth={2} color={PALETTE.meta} />
      </div>
      <div
        className="tabular flex items-center justify-center"
        style={{
          position: "absolute",
          left: "50%",
          top: -20,
          minWidth: 32,
          height: 28,
          padding: "0 7px",
          transform: `translateX(-50%) scale(${1 + 0.14 * tick})`,
          borderRadius: 14,
          background: PALETTE.green,
          color: PALETTE.onGreen,
          fontSize: 17,
          fontWeight: 500,
        }}
      >
        {count}
      </div>
    </div>
  );
}

/** Light from the buried answer, leaking out from under the header where it went. */
function BuriedGlow({ x, strength }: { x: number; strength: number }) {
  const o = clamp01(strength);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: AREA.top - 40, height: 80, pointerEvents: "none", opacity: o }}>
      <div
        style={{
          position: "absolute",
          left: x - 230,
          top: 0,
          width: 460,
          height: 80,
          background: "radial-gradient(closest-side, rgba(110,231,183,0.7), rgba(16,185,129,0.25) 55%, rgba(16,185,129,0) 100%)",
          mixBlendMode: "screen",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x - 200,
          top: 39,
          width: 400,
          height: 3,
          background: "linear-gradient(90deg, rgba(52,211,153,0), rgba(167,243,208,1) 50%, rgba(52,211,153,0))",
          boxShadow: "0 0 14px rgba(52,211,153,0.9)",
        }}
      />
    </div>
  );
}

function Row({ placed, frame, tint }: { placed: Placed; frame: number; tint: number }) {
  const { item } = placed;
  if (placed.top > AREA_HEIGHT + 20 || placed.top + placed.height + REACTION.overhang < -20) return null;
  if (item.kind !== "message") {
    return item.kind === "chip" ? <DayChip text={item.text} top={placed.top} /> : <UnreadDivider text={item.text} top={placed.top} />;
  }
  const layout = placed.layout;
  if (!layout) return null;
  const p = placed.pop;
  return (
    <div
      style={{
        position: "absolute",
        left: BUBBLE.x,
        top: placed.top,
        opacity: p,
        transform: p < 1 ? `translateY(${(1 - p) * 16}px) scale(${0.94 + 0.06 * p})` : undefined,
        transformOrigin: "0% 100%",
      }}
    >
      <Bubble message={item} layout={layout} tint={tint} />
      {item.reactions?.length ? <Reactions message={item} frame={frame} top={placed.height - 10} /> : null}
    </div>
  );
}

function DayChip({ text, top }: { text: string; top: number }) {
  return (
    <div className="flex justify-center" style={{ position: "absolute", left: 0, right: 0, top, height: UI.chip }}>
      <div
        className="flex items-center"
        style={{ height: UI.chip, padding: "0 18px", borderRadius: 10, background: PALETTE.chip, fontSize: 20, color: PALETTE.meta, fontWeight: 500 }}
      >
        {text}
      </div>
    </div>
  );
}

function UnreadDivider({ text, top }: { text: string; top: number }) {
  return (
    <div
      className="flex items-center justify-center"
      style={{ position: "absolute", left: 0, right: 0, top, height: UI.divider, background: "rgba(24,34,41,0.88)" }}
    >
      <span style={{ fontSize: 20, fontWeight: 500, color: PALETTE.text, opacity: 0.86 }}>{text}</span>
    </div>
  );
}

/** "r,g,b" between two colours. */
export function mixRgb(a: [number, number, number], b: [number, number, number], t: number): string {
  return a.map((v, i) => Math.round(mix(v, b[i], t))).join(",");
}

const BUBBLE_RGB: [number, number, number] = [32, 44, 51];
const BURIED_RGB: [number, number, number] = [27, 66, 59];

function Bubble({ message, layout, tint = 0 }: { message: ChatMessage; layout: MessageLayout; tint?: number }) {
  const background = tint > 0 ? `rgb(${mixRgb(BUBBLE_RGB, BURIED_RGB, tint)})` : PALETTE.bubble;
  const shape: CSSProperties = {
    position: "relative",
    height: layout.height,
    background,
    borderRadius: `0 ${BUBBLE.radius}px ${BUBBLE.radius}px ${BUBBLE.radius}px`,
    boxShadow:
      tint > 0
        ? `0 1px 1px rgba(0,0,0,0.25), inset 0 0 0 1.5px rgba(52,211,153,${0.3 * tint}), 0 0 30px rgba(16,185,129,${0.24 * tint})`
        : "0 1px 1px rgba(0,0,0,0.25)",
  };
  if (message.link && layout.link) return <LinkBubble message={message} layout={layout} link={message.link} style={shape} background={background} />;
  const lastIndex = layout.lines.length - 1;
  return (
    <div style={{ ...shape, width: "max-content", maxWidth: BUBBLE.maxText + 2 * BUBBLE.padX, padding: `${BUBBLE.padTop}px ${BUBBLE.padX}px 0` }}>
      <Tail color={background} />
      <NameLine sender={message.sender} />
      {layout.quote ? <Quote sender={layout.quote.sender} lines={layout.quote.lines} /> : null}
      {layout.lines.map((line, i) => (
        <div key={i} style={{ height: BUBBLE.line, fontSize: BUBBLE.text, lineHeight: `${BUBBLE.line}px`, whiteSpace: "nowrap" }}>
          {line}
          {i === lastIndex && !layout.timeOwnLine ? <span style={{ display: "inline-block", width: BUBBLE.timeRoom }} /> : null}
        </div>
      ))}
      <Time>{message.time}</Time>
    </div>
  );
}

function Tail({ color }: { color: string }) {
  return (
    <svg width={12} height={18} viewBox="0 0 12 18" style={{ position: "absolute", left: -11, top: 0 }}>
      <path d="M12 0 H2.5 C0.6 0 -0.1 2.2 1.3 3.5 L12 14 Z" fill={color} />
    </svg>
  );
}

function NameLine({ sender }: { sender: Sender }) {
  return (
    <div className="flex items-baseline" style={{ height: BUBBLE.name, gap: 14, whiteSpace: "nowrap" }}>
      <span style={{ fontSize: BUBBLE.nameSize, lineHeight: `${BUBBLE.name - 4}px`, fontWeight: 500, color: sender.color }}>
        {sender.phone ? `~ ${sender.name}` : sender.name}
      </span>
      {sender.phone ? (
        <span className="tabular" style={{ fontSize: BUBBLE.phoneSize, color: PALETTE.meta }}>
          {sender.phone}
        </span>
      ) : null}
    </div>
  );
}

function Quote({ sender, lines }: { sender: Sender; lines: string[] }) {
  return (
    <div
      style={{
        marginTop: QUOTE.marginTop,
        marginBottom: QUOTE.marginBottom,
        height: quoteHeight(lines.length),
        borderRadius: 8,
        overflow: "hidden",
        background: PALETTE.quote,
        borderLeft: `${QUOTE.bar}px solid ${sender.color}`,
        padding: `${QUOTE.padY}px ${QUOTE.padX}px`,
        whiteSpace: "nowrap",
      }}
    >
      <div style={{ fontSize: QUOTE.size, lineHeight: `${QUOTE.line}px`, fontWeight: 500, color: sender.color }}>
        {sender.phone ? `~ ${sender.name}` : sender.name}
      </div>
      {lines.map((line, i) => (
        <div key={i} style={{ fontSize: QUOTE.size, lineHeight: `${QUOTE.line}px`, color: "rgba(233,237,239,0.66)" }}>
          {line}
        </div>
      ))}
    </div>
  );
}

function Time({ children }: { children: ReactNode }) {
  return (
    <span
      className="tabular"
      style={{ position: "absolute", right: 12, bottom: 7, fontSize: BUBBLE.timeSize, lineHeight: "20px", color: PALETTE.meta }}
    >
      {children}
    </span>
  );
}

function Reactions({ message, frame, top }: { message: ChatMessage; frame: number; top: number }) {
  const reactions = message.reactions ?? [];
  const shown = reactions.filter((r) => r.at - LAND_LEAD <= frame);
  if (!shown.length) return null;
  const pill = enter(frame, reactions[0].at - LAND_LEAD, POP);
  return (
    <div
      className="flex items-center"
      style={{
        position: "absolute",
        left: 14,
        top,
        height: REACTION.height,
        padding: "0 9px",
        gap: 3,
        borderRadius: REACTION.height / 2,
        background: PALETTE.bubble,
        border: `2.5px solid ${PALETTE.bg}`,
        opacity: pill,
        transform: `scale(${0.6 + 0.4 * pill})`,
        transformOrigin: "20% 50%",
      }}
    >
      {shown.map((r) => {
        const t = enter(frame, r.at - LAND_LEAD, POP);
        return (
          <span key={r.emoji} style={{ fontSize: 25, lineHeight: "30px", display: "inline-block", transform: `scale(${0.5 + 0.5 * t})`, opacity: t }}>
            {r.emoji}
          </span>
        );
      })}
      {shown.length > 1 ? <span style={{ fontSize: 20, color: PALETTE.meta, marginLeft: 4 }}>{shown.length}</span> : null}
    </div>
  );
}

type LinkBubbleProps = { message: ChatMessage; layout: MessageLayout; link: LinkPreview; style: CSSProperties; background: string };

/** A shared link: the quoted question, the page's rich preview, then the URL itself. */
function LinkBubble({ message, layout, link, style, background }: LinkBubbleProps) {
  const inner = BUBBLE.padX - LINK.inset;
  const [padTop, padX, padBottom] = LINK.textPad;
  const lines = layout.link!;
  return (
    <div style={{ ...style, width: LINK.width, padding: `${BUBBLE.padTop}px ${LINK.inset}px 0` }}>
      <Tail color={background} />
      <div style={{ padding: `0 ${inner}px` }}>
        <NameLine sender={message.sender} />
        {layout.quote ? <Quote sender={layout.quote.sender} lines={layout.quote.lines} /> : null}
      </div>
      <div style={{ height: lines.cardHeight, borderRadius: 10, overflow: "hidden", background: PALETTE.preview }}>
        <OgImage title={link.title} footer={link.footer} width={LINK_IMAGE.width} />
        <div style={{ padding: `${padTop}px ${padX}px ${padBottom}px`, whiteSpace: "nowrap" }}>
          {lines.titleLines.map((line, i) => (
            <div key={i} style={{ fontSize: LINK.titleSize, lineHeight: `${LINK.titleLine}px`, fontWeight: 500, color: PALETTE.text }}>
              {line}
            </div>
          ))}
          <div style={{ fontSize: LINK.descSize, lineHeight: `${LINK.descLine}px`, color: PALETTE.meta, overflow: "hidden", textOverflow: "ellipsis" }}>
            {link.description}
          </div>
          <div style={{ fontSize: LINK.domainSize, lineHeight: `${LINK.domainLine}px`, color: PALETTE.meta }}>{link.domain}</div>
        </div>
      </div>
      <div style={{ padding: `${LINK.urlGap}px ${inner}px 0`, whiteSpace: "nowrap" }}>
        {lines.urlLines.map((line, i) => (
          <div
            key={i}
            style={{
              fontSize: LINK.urlSize,
              lineHeight: `${LINK.urlLine}px`,
              color: PALETTE.link,
              textDecoration: "underline",
              textDecorationColor: "rgba(83,189,235,0.5)",
              textUnderlineOffset: 4,
            }}
          >
            {line}
          </div>
        ))}
      </div>
      <Time>{message.time}</Time>
    </div>
  );
}

function ogTitleSize(title: string): number {
  if (title.length <= 40) return 76;
  if (title.length <= 80) return 62;
  if (title.length <= 130) return 50;
  return 42;
}

/** `renderOgImage` from src/lib/og.tsx as a component: drawn at 1200×630 and scaled to `width`. */
export function OgImage({ title, footer, width }: { title: string; footer: string; width: number }) {
  const k = width / 1200;
  const size = ogTitleSize(title);
  return (
    <div style={{ width, height: 630 * k, overflow: "hidden", position: "relative" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 1200,
          height: 630,
          transform: `scale(${k})`,
          transformOrigin: "0 0",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#08090a",
          backgroundImage: "radial-gradient(circle at 18% 0%, rgba(16,185,129,0.22), rgba(8,9,10,0) 55%)",
          color: "#f7f8f8",
          fontFamily: ogFont,
          fontWeight: 400,
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 11,
              background: "#10b981",
              color: "#04120c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
            }}
          >
            P
          </div>
          <div style={{ marginLeft: 16, fontSize: 28, color: "#8a8f98" }}>PSA FAU Community Forum</div>
        </div>
        <div style={{ fontSize: size, letterSpacing: -1.5, lineHeight: 1.12, maxHeight: size * 1.12 * 3, overflow: "hidden" }}>{title}</div>
        <div style={{ fontSize: 28, color: "#8a8f98", minHeight: 34 }}>{footer}</div>
      </div>
    </div>
  );
}
