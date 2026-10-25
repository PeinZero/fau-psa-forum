import { CALM_MESSAGES, type ChatBeat, NOISE_MESSAGES } from "../../lib/chat-beats.ts";
import { localBeat, type SceneId } from "../../lib/timeline.ts";

/*
 * The "Queries" group: a portrait of the problem, so it looks like the familiar dark-mode
 * messenger, not like the forum. Every name is invented; unsaved contacts show "~ Name" and a
 * masked number. Pakistani numbers belong to students who have only just arrived.
 */

export type Sender = { name: string; color: string; phone?: string };

const people = {
  ahmed: { name: "Ahmed", color: "#53bdeb", phone: "+49 152 •••• ••31" },
  sara: { name: "Sara", color: "#fc9775", phone: "+49 176 •••• ••08" },
  bilal: { name: "Bilal", color: "#06cf9c" },
  zainab: { name: "Zainab", color: "#d88deb", phone: "+49 157 •••• ••72" },
  hamza: { name: "Hamza", color: "#ffd279" },
  usman: { name: "Usman", color: "#a5b337", phone: "+49 151 •••• ••19" },
  fatima: { name: "Fatima", color: "#ff72a1", phone: "+92 333 •••••54" },
  hassan: { name: "Hassan", color: "#8b7cff", phone: "+49 170 •••• ••86" },
  ayesha: { name: "Ayesha", color: "#42c7b8" },
  danish: { name: "Danish", color: "#f15c6d", phone: "+49 155 •••• ••40" },
  mariam: { name: "Mariam", color: "#e48bd0", phone: "+49 159 •••• ••27" },
  saad: { name: "Saad", color: "#5fb3f9", phone: "+92 321 •••••65" },
  hira: { name: "Hira", color: "#c3a6ff", phone: "+49 172 •••• ••03" },
  omar: { name: "Omar", color: "#ff9b6a", phone: "+49 178 •••• ••58" },
  ali: { name: "Ali", color: "#53bdeb" },
  imran: { name: "Imran", color: "#ffd279", phone: "+49 163 •••• ••77" },
  areeba: { name: "Areeba", color: "#fc9775", phone: "+49 160 •••• ••12" },
} satisfies Record<string, Sender>;

export const GROUP = {
  name: "Queries",
  members: "Ahmed, Ayesha, Bilal, Hamza, +1,280",
};

type Reaction = { emoji: string; at: number };

export type ChatMessage = {
  id: string;
  sender: Sender;
  text: string;
  time: string;
  /** Local frame the bubble lands (its beat: the score pops on it). */
  at: number;
  /** The message this one replies to (shown as a quote). */
  replyTo?: string;
  reactions?: Reaction[];
  /** A shared link: the text is the URL, shown under a rich preview. */
  link?: LinkPreview;
};

export type LinkPreview = { title: string; description: string; domain: string; footer: string };

export type MessageItem = { kind: "message" } & ChatMessage;
export type ChatItem = { kind: "chip" | "divider"; id: string; text: string } | MessageItem;

/** "<name> is typing…" replaces the member line between these local frames. */
export type Typing = { name: string; from: number; to: number };

/** Local frame on which message `id` lands. */
export function landsAt(items: ChatItem[], id: string): number {
  const item = items.find((it) => it.id === id);
  if (!item || item.kind !== "message") throw new Error(`No message ${id}`);
  return item.at;
}

function beatOf(beats: ChatBeat[], id: SceneId, label: string): number {
  const found = beats.find((b) => b.message.startsWith(label));
  if (!found) throw new Error(`No chat beat "${label}"`);
  return localBeat(id, found.beat);
}

const noise = (label: string) => beatOf(NOISE_MESSAGES, "noise", label);
const calm = (label: string) => beatOf(CALM_MESSAGES, "backToChat", label);

const msg = (m: ChatMessage): ChatItem => ({ kind: "message", ...m });

/** Scene 1: a day of questions in twelve seconds. The texts are the owner's, typos and all. */
export const NOISE_ITEMS: ChatItem[] = [
  { kind: "chip", id: "today", text: "Today" },
  { kind: "divider", id: "unread", text: "12 unread messages" },
  msg({ id: "m1", sender: people.ahmed, time: "09:12", at: noise("1 "), text: "please suggest what courses to take in first semester" }),
  msg({
    id: "m2",
    sender: people.sara,
    time: "09:40",
    at: noise("2 "),
    text: "can anyone guide on procedure to apply for RP in erlangen or nuremberg",
  }),
  msg({
    id: "m3",
    sender: people.bilal,
    time: "10:05",
    at: noise("3 "),
    replyTo: "m2",
    text: "book appointment on auslanderbehorde website, bring anmeldung + insurance + sperrkonto proof. took me 5 weeks",
  }),
  msg({ id: "m4", sender: people.zainab, time: "11:18", at: noise("4 "), text: "how to apply for fau german language course ?" }),
  msg({
    id: "m5",
    sender: people.hamza,
    time: "11:31",
    at: noise("5 "),
    replyTo: "m1",
    text: "depends on your program bro, check the study plan on campo",
  }),
  msg({
    id: "m6",
    sender: people.usman,
    time: "12:02",
    at: noise("6 "),
    text: 'anyone took seminar on "machine learning" in the past? Review about this ?',
  }),
  msg({
    id: "m7",
    sender: people.fatima,
    time: "12:47",
    at: noise("7 "),
    text: "this is my first semester i arrive 2 days ago who to register for course on campo",
  }),
  msg({ id: "m8", sender: people.hassan, time: "13:15", at: noise("8 "), text: "TK or AOK for enrolment??" }),
  msg({ id: "m9a", sender: people.ayesha, time: "13:16", at: noise("9a "), replyTo: "m8", text: "TK" }),
  msg({ id: "m9b", sender: people.danish, time: "13:22", at: noise("9b "), replyTo: "m8", text: "AOK is better tbh" }),
  msg({
    id: "m10",
    sender: people.mariam,
    time: "14:03",
    at: noise("10 "),
    text: "i purchased deutschland ticket but i cant it see it vgn app help!!!!",
  }),
  msg({ id: "m11", sender: people.saad, time: "14:40", at: noise("11 "), text: "bhai any room in nuremberg?? WG anything" }),
  msg({
    id: "m12",
    sender: people.hira,
    time: "15:26",
    at: noise("12 "),
    text: "anyone got anmeldung appointment in erlangen? all slots booked 😭",
  }),
  msg({ id: "m13", sender: people.omar, time: "16:10", at: noise("13 "), text: "how to apply for RP in nuremberg??" }),
  msg({
    id: "m14",
    sender: people.ali,
    time: "16:12",
    at: noise("14 replies"),
    replyTo: "m13",
    text: "asked 3 times today, scroll up 🙏",
    reactions: [{ emoji: "😂", at: noise("14 reaction") }],
  }),
  msg({ id: "m15", sender: people.imran, time: "16:13", at: noise("15 "), replyTo: "m13", text: "+1 same question" }),
];

/** Bilal's answer: the one that gets buried. */
export const BURIED_ID = "m3";

/** Ali types now and then; the last time ends as his reply lands. */
export const NOISE_TYPING: Typing[] = [
  { name: "Ali", from: 100, to: 128 },
  { name: "Ali", from: 247, to: noise("14 replies") - 2 },
];

const RP_THREAD_URL = "https://fau-psa-forum.vercel.app/t/how-do-i-get-or-extend-my-student-residence-permit-in-erlang-8f30df";

/** The starter thread as its page's Open Graph tags and image describe it (src/lib/og.tsx). */
export const RP_LINK: LinkPreview = {
  title: "How do I get or extend my student residence permit in Erlangen or Nuremberg?",
  description:
    "Most Pakistani students enter Germany on a national (D) study visa. After arrival, the visa has to be converted into a residence permit for study purposes (§ 1…",
  domain: "fau-psa-forum.vercel.app",
  footer: "RP & Visa · Erlangen & Nuremberg",
};

/** Scene 9: the same group, calm. The question comes once more and the answer is the thread. */
export const CALM_ITEMS: ChatItem[] = [
  { kind: "chip", id: "today", text: "Today" },
  msg({ id: "q", sender: people.areeba, time: "18:41", at: calm("the RP question"), text: "how to apply for RP in erlangen??" }),
  msg({
    id: "reply",
    sender: people.bilal,
    time: "18:42",
    at: calm("reply quoting"),
    replyTo: "q",
    text: RP_THREAD_URL,
    link: RP_LINK,
    reactions: [
      { emoji: "🙏", at: calm("reaction 🙏") },
      { emoji: "👍", at: calm("reaction 👍") },
    ],
  }),
];

export const CALM_TYPING: Typing[] = [{ name: "Bilal", from: 64, to: calm("reply quoting") - 2 }];
