import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CALM_MESSAGES, NOISE_MESSAGES } from "../src/lib/chat-beats.ts";
import { localBeat, scene } from "../src/lib/timeline.ts";
import { lines as noiseLines } from "../src/lines/noise.ts";
import { BURIED_ID, CALM_ITEMS, type ChatItem, landsAt, NOISE_ITEMS, RP_LINK } from "../src/screens/chat/conversation.ts";
import { exitFrame, prepare } from "../src/screens/chat/layout.ts";

const messages = (items: ChatItem[]) => items.filter((i) => i.kind === "message");

// The owner's conversation, typos and casing exactly as written.
const SCRIPT: [string, string][] = [
  ["m1", "please suggest what courses to take in first semester"],
  ["m2", "can anyone guide on procedure to apply for RP in erlangen or nuremberg"],
  ["m3", "book appointment on auslanderbehorde website, bring anmeldung + insurance + sperrkonto proof. took me 5 weeks"],
  ["m4", "how to apply for fau german language course ?"],
  ["m5", "depends on your program bro, check the study plan on campo"],
  ["m6", 'anyone took seminar on "machine learning" in the past? Review about this ?'],
  ["m7", "this is my first semester i arrive 2 days ago who to register for course on campo"],
  ["m8", "TK or AOK for enrolment??"],
  ["m9a", "TK"],
  ["m9b", "AOK is better tbh"],
  ["m10", "i purchased deutschland ticket but i cant it see it vgn app help!!!!"],
  ["m11", "bhai any room in nuremberg?? WG anything"],
  ["m12", "anyone got anmeldung appointment in erlangen? all slots booked 😭"],
  ["m13", "how to apply for RP in nuremberg??"],
  ["m14", "asked 3 times today, scroll up 🙏"],
  ["m15", "+1 same question"],
];

describe("the Queries chat", () => {
  it("plays the owner's conversation word for word, in order", () => {
    assert.deepEqual(
      messages(NOISE_ITEMS).map((m) => [m.id, m.text]),
      SCRIPT,
    );
  });

  it("threads the replies the way the story needs", () => {
    const byId = new Map(messages(NOISE_ITEMS).map((m) => [m.id, m]));
    assert.equal(byId.get("m3")?.replyTo, "m2", "Bilal answers the RP question");
    assert.equal(byId.get("m5")?.replyTo, "m1");
    assert.equal(byId.get("m9a")?.replyTo, "m8");
    assert.equal(byId.get("m9b")?.replyTo, "m8");
    assert.equal(byId.get("m14")?.replyTo, "m13");
    assert.equal(byId.get("m15")?.replyTo, "m13");
    assert.equal(BURIED_ID, "m3");
    assert.notEqual(byId.get("m13")?.sender.name, byId.get("m2")?.sender.name, "the repeat comes from a new sender");
  });

  it("starts slow and gives the story's messages 1.5 s each before the next one lands", () => {
    const at = (id: string) => landsAt(NOISE_ITEMS, id);
    const READ = 45;
    assert.ok(at("m2") - at("m1") >= READ && at("m3") - at("m2") >= READ, "the first messages can be read");
    assert.ok(at("m4") - at("m3") >= READ, "Bilal's answer can be read");
    assert.ok(at("m14") - at("m13") >= READ, "the repeat can be read");
    assert.ok(scene("noise").cutOut - at("m14") >= READ, "'scroll up' can be read before the drop");
    const gaps = NOISE_MESSAGES.slice(1).map((b, i) => b.beat - NOISE_MESSAGES[i].beat);
    assert.ok(Math.min(...gaps.slice(-8)) < Math.min(...gaps.slice(0, 3)), "the messages speed up");
  });

  it("buries Bilal's answer exactly when the line says so, before the repeat arrives", () => {
    const gone = exitFrame(prepare(NOISE_ITEMS), BURIED_ID, landsAt(NOISE_ITEMS, BURIED_ID), scene("noise").durationInFrames);
    const buried = noiseLines.find((l) => l.text === "Every semester, the answers get buried.");
    assert.ok(buried, "the line exists");
    assert.ok(Math.abs(buried.from - gone) <= 3, `line at ${buried.from}, answer gone at ${gone}`);
    assert.ok(gone < landsAt(NOISE_ITEMS, "m13"), "the answer is gone before the question comes back");
  });

  it("lands scene 9's messages on the calm beats the score plays", () => {
    const landed = messages(CALM_ITEMS).map((m) => landsAt(CALM_ITEMS, m.id));
    const beats = CALM_MESSAGES.filter((b) => !b.message.includes("reaction")).map((b) => localBeat("backToChat", b.beat));
    assert.deepEqual(landed, beats);
  });

  it("answers the question in scene 9 with the residence permit thread", () => {
    assert.equal(RP_LINK.title, "How do I get or extend my student residence permit in Erlangen or Nuremberg?");
    const reply = messages(CALM_ITEMS).find((m) => m.replyTo);
    assert.ok(reply, "the reply quotes the question");
    assert.match(reply.text, /^https:\/\/fau-psa-forum\.vercel\.app\/t\//);
  });

  it("never names the messenger it resembles", () => {
    const all = [...NOISE_ITEMS, ...CALM_ITEMS].map((i) => i.text).join("\n");
    assert.doesNotMatch(all, /whatsapp/i);
  });
});
