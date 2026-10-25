/**
 * When each message of the "Queries" group lands, in beats from the start of the film (120 BPM,
 * a beat is 0.5 s). The score plays a notification pop on every one, so the chat becomes the
 * rhythm; the chat scenes draw the bubbles on the same beats.
 *
 * Scene 1 starts slow (each of the first messages readable for at least 1.5 s), then speeds up
 * to eighth notes until the chat scrolls by itself. Bilal's answer (3) is pushed out of view
 * around beat 12, the line "Every semester, the answers get buried." sits on that moment, and
 * the repeated question (13) follows on beat 16.
 */
export type ChatBeat = { message: string; beat: number };

export const NOISE_MESSAGES: ChatBeat[] = [
  { message: "1 Ahmed: courses in first semester", beat: 0 },
  { message: "2 Sara: procedure to apply for RP", beat: 3 },
  { message: "3 Bilal replies to 2: the answer", beat: 6 },
  { message: "4 fau german language course", beat: 9 },
  { message: "5 Hamza replies to 1", beat: 10 },
  { message: "6 seminar on machine learning", beat: 11 },
  { message: "7 first semester, register on campo", beat: 12 },
  { message: "8 TK or AOK", beat: 13 },
  { message: "9a reply to 8: TK", beat: 13.5 },
  { message: "9b reply to 8: AOK is better tbh", beat: 14 },
  { message: "10 deutschland ticket in vgn app", beat: 14.5 },
  { message: "11 room in nuremberg", beat: 15 },
  { message: "12 anmeldung appointment in erlangen", beat: 15.5 },
  { message: "13 new sender: RP in nuremberg (the repeat)", beat: 16 },
  { message: "14 replies to 13: scroll up", beat: 19 },
  { message: "14 reaction 😂", beat: 20 },
  { message: "15 replies to 13: +1 same question", beat: 20.5 },
];

/** Scene 9, the breakdown: the RP question once more, answered with the thread's link. */
export const CALM_MESSAGES: ChatBeat[] = [
  { message: "the RP question again", beat: 150 },
  { message: "reply quoting it, with the thread link and preview", beat: 154 },
  { message: "reaction 🙏", beat: 156 },
  { message: "reaction 👍", beat: 157 },
];
