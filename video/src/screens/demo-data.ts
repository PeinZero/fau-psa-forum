import type { Affiliation, Role } from "../ui/avatar";

/*
 * Shared demo content for every scene. Titles, categories, cities and thread bodies come from
 * docs/content/threads (the forum's starter threads, exactly as published); the people are neutral
 * demo accounts, never real members.
 *
 * Demo accounts: display names are role-like ("New student", "Erlangen helper", "Nuremberg helper",
 * "PSA team") so the avatar tiles read as neutral initials (NS, EH, NH, PT). Handles follow the
 * site's username rule `^[a-z0-9_]{3,20}$` (no dots), e.g. `@new_student`.
 */

export type CityKey = "erlangen" | "nuremberg" | "both";

/** City as meta lines and bylines print it. */
export const cityLabels: Record<CityKey, string> = {
  erlangen: "Erlangen",
  nuremberg: "Nuremberg",
  both: "Erlangen & Nuremberg",
};

/** City as the ask form's picker words it. */
export const cityOptionLabels: Record<CityKey, string> = {
  erlangen: "Erlangen",
  nuremberg: "Nuremberg",
  both: "Both cities",
};

export const NO_CITY_LABEL = "Not city-specific";

export type Category = {
  slug: string;
  name: string;
  description: string;
  /** Published threads in the category (sidebar counts). */
  threadCount: number;
};

/** The six categories from the seed migration, in the site's sort order; icons via `CategoryGlyph`. */
export const categories = {
  rpVisa: {
    slug: "rp-visa",
    name: "RP & Visa",
    description: "Residence permit, visa appointments and the Ausländerbehörde.",
    threadCount: 2,
  },
  courses: { slug: "courses", name: "Courses", description: "Study programmes, exams, enrolment and university admin.", threadCount: 0 },
  accommodation: {
    slug: "accommodation",
    name: "Accommodation",
    description: "Finding a room, dorms, contracts and Anmeldung.",
    threadCount: 2,
  },
  jobs: { slug: "jobs", name: "Jobs", description: "Student jobs, Werkstudent positions, internships and careers.", threadCount: 1 },
  firstSteps: {
    slug: "first-steps",
    name: "First Steps",
    description: "Arriving in Erlangen or Nuremberg: banking, insurance, SIM, transport.",
    threadCount: 2,
  },
  other: { slug: "other", name: "Other", description: "Everything else.", threadCount: 1 },
} satisfies Record<string, Category>;

export const categoryList: Category[] = [
  categories.rpVisa,
  categories.courses,
  categories.accommodation,
  categories.jobs,
  categories.firstSteps,
  categories.other,
];

export type DemoUser = {
  username: string;
  displayName: string;
  role: Role;
  affiliation: Affiliation | null;
  reputation: number;
  bestAnswerCount: number;
};

export const users = {
  /** The member who asks in scene 5 and receives the notifications in scene 6. */
  newStudent: {
    username: "new_student",
    displayName: "New student",
    role: "member",
    affiliation: "student",
    reputation: 3,
    bestAnswerCount: 0,
  },
  /** Writes the best answers; 10+ best answers earns the Top helper badge. */
  erlangenHelper: {
    username: "erlangen_helper",
    displayName: "Erlangen helper",
    role: "member",
    affiliation: "graduate",
    reputation: 248,
    bestAnswerCount: 12,
  },
  nurembergHelper: {
    username: "nbg_helper",
    displayName: "Nuremberg helper",
    role: "member",
    affiliation: "resident",
    reputation: 87,
    bestAnswerCount: 3,
  },
  /** Moderator account: writes the starter threads, approves and curates in scene 6. */
  psaTeam: {
    username: "psa_team",
    displayName: "PSA team",
    role: "moderator",
    affiliation: "student",
    reputation: 120,
    bestAnswerCount: 2,
  },
} satisfies Record<string, DemoUser>;

/**
 * Post bodies as blocks; inline text supports `**bold**` and `[label](url)` like the site's Markdown.
 * `h` is a section heading inside a post (the site renders every Markdown heading as h3).
 */
export type Block =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

export type DemoComment = {
  id: number;
  author: DemoUser;
  /** Absolute date as comment meta lines print it. */
  date: string;
  body: Block[];
  score: number;
};

export type DemoThread = {
  id: number;
  slug: string;
  title: string;
  category: Category;
  city: CityKey | null;
  author: DemoUser;
  /** Byline date ("22 Oct 2026"). */
  date: string;
  /** Feed-row time ("3 days ago"). */
  relative: string;
  body: Block[];
  /** Two-line feed teaser, cut the way the site cuts it (220 characters on a word boundary). */
  excerpt: string;
  score: number;
  commentCount: number;
  /** "Oct 2026" shows the Verified pill; null hides it. */
  verifiedMonth: string | null;
  pinned: boolean;
  outdated: boolean;
  bestCommentId: number | null;
  comments: DemoComment[];
};

const anmeldungBody: Block[] = [
  {
    type: "p",
    text: "Everyone who moves into a flat or dorm room in Germany has to register the address with the city (Anmeldung). You need the registration confirmation for later steps such as the residence permit. Here is how it works in Erlangen and Nuremberg.",
  },
  { type: "h", text: "The rule" },
  {
    type: "ul",
    items: [
      "Register **within two weeks after moving in** (§ 17 Bundesmeldegesetz). In Nuremberg you can register at the earliest on the day you move in.",
      "Your landlord (or the dorm administration) must give you a **Wohnungsgeberbestätigung**, a written confirmation that you moved in (§ 19 Bundesmeldegesetz). If they refuse or are late, tell the registration office.",
      "A hostel or boarding house does not count. FAU points out that you can only register with a permanent address.",
      "Registration is **free** in both cities.",
    ],
  },
  { type: "h", text: "Erlangen" },
  {
    type: "ol",
    items: [
      "Office: Bürgerservice (Meldewesen), ground floor of the Rathaus, Rathausplatz 1, 91052 Erlangen.",
      "Book an appointment online (link below) and check the opening hours on the city page before you go.",
      "Bring the documents listed below. The registration form (Meldeschein) is available at the office.",
      "Online registration is currently only possible for German citizens and EU citizens with an eID card, so as a Pakistani citizen you register in person.",
    ],
  },
  { type: "h", text: "Nuremberg" },
  {
    type: "ol",
    items: [
      "Offices: Bürgeramt Mitte (Äußere Laufer Gasse 25) plus the Bürgerämter Eberhardshof, Frankenstraße, Nord, Ost and Süd, and some Sparkasse branches.",
      "You need an appointment. Bürgeramt Mitte also takes urgent cases without an appointment on Wednesdays from 8 to 12.",
      "The online service requires a German ID card or an EU eID card, so plan to register in person.",
    ],
  },
  { type: "h", text: "Documents you need" },
  {
    type: "ul",
    items: [
      "Your passport (with visa)",
      "The Wohnungsgeberbestätigung from your landlord or dorm",
      "The signed registration form (Meldeschein), available at the office",
      "In Nuremberg, the city also lists birth or marriage certificates of everyone involved when moving to Nuremberg. Ask when you book if this applies to you.",
    ],
  },
  { type: "h", text: "Common mistakes" },
  {
    type: "ul",
    items: [
      "Waiting too long. Late registration is an administrative offence and can be fined.",
      "Moving in without asking the landlord for the Wohnungsgeberbestätigung. Ask for it when you sign the contract.",
      "Trying to register a hotel or short-term booking.",
      "Forgetting to deregister (Abmeldung) within two weeks when you leave Germany for good (§ 17 (2) Bundesmeldegesetz).",
    ],
  },
  { type: "h", text: "Sources" },
  {
    type: "ul",
    items: [
      "[Bundesmeldegesetz § 17 (deadline)](https://www.gesetze-im-internet.de/bmg/__17.html)",
      "[Bundesmeldegesetz § 19 (landlord confirmation)](https://www.gesetze-im-internet.de/bmg/__19.html)",
      "[City of Erlangen: Anmeldung](https://erlangen.de/service/365) and [appointment booking](https://erlangen.flexappoint.de/)",
      "[City of Nuremberg: Wohnungswechsel / Anmeldung](https://www.nuernberg.de/)",
      "[FAU: Entry and visas (registering your address)](https://www.fau.eu/)",
    ],
  },
  { type: "p", text: "Last checked: October 2026" },
];

/** The best answer on the Anmeldung thread; every fact in it is in the thread itself. */
export const anmeldungBestAnswer: DemoComment = {
  id: 101,
  author: users.erlangenHelper,
  date: "23 Oct 2026",
  score: 12,
  body: [
    {
      type: "p",
      text: "Book the appointment as soon as you have your contract: you have two weeks after moving in. Ask your landlord for the **Wohnungsgeberbestätigung** when you sign, and bring it with your passport (with visa) and the signed Meldeschein.",
    },
    {
      type: "p",
      text: "Registration is free. Keep the confirmation they give you, you'll need it for your residence permit.",
    },
  ],
};

export const anmeldungThread: DemoThread = {
  id: 1,
  slug: "how-do-i-register-my-address-anmeldung-in-erlangen-or-nuremb-c476e3",
  title: "How do I register my address (Anmeldung) in Erlangen or Nuremberg?",
  category: categories.accommodation,
  city: "both",
  author: users.psaTeam,
  date: "22 Oct 2026",
  relative: "3 days ago",
  body: anmeldungBody,
  excerpt:
    "Everyone who moves into a flat or dorm room in Germany has to register the address with the city (Anmeldung). You need the registration confirmation for later steps such as the residence permit. Here is how it works in…",
  score: 24,
  commentCount: 3,
  verifiedMonth: "Oct 2026",
  pinned: false,
  outdated: false,
  bestCommentId: anmeldungBestAnswer.id,
  comments: [
    anmeldungBestAnswer,
    {
      id: 102,
      author: users.nurembergHelper,
      date: "23 Oct 2026",
      score: 5,
      body: [
        {
          type: "p",
          text: "Same in Nuremberg, but if it's urgent: Bürgeramt Mitte takes urgent cases without an appointment on Wednesdays from 8 to 12.",
        },
      ],
    },
    {
      id: 103,
      author: users.newStudent,
      date: "24 Oct 2026",
      score: 2,
      body: [{ type: "p", text: "Thank you! Asked my landlord for the Wohnungsgeberbestätigung and booked a slot at the Rathaus 🙏" }],
    },
  ],
};

/** Scene 5: the question a member asks. Posted as "Waiting for review", approved in scene 6. */
export const roomQuestion: DemoThread = {
  id: 9,
  slug: "finding-a-room-in-erlangen-any-tips-7f2a10",
  title: "Finding a room in Erlangen, any tips?",
  category: categories.accommodation,
  city: "erlangen",
  author: users.newStudent,
  date: "25 Oct 2026",
  relative: "just now",
  body: [
    {
      type: "p",
      text: "I'm starting my Master's at FAU in April and need a room in Erlangen from March. I've applied for a Studierendenwerk dorm but haven't heard back yet.",
    },
    { type: "p", text: "Where else should I look, and how do I tell if a listing is fake?" },
  ],
  excerpt:
    "I'm starting my Master's at FAU in April and need a room in Erlangen from March. I've applied for a Studierendenwerk dorm but haven't heard back yet. Where else should I look, and how do I tell if a listing is fake?",
  score: 0,
  commentCount: 0,
  verifiedMonth: null,
  pinned: false,
  outdated: false,
  bestCommentId: null,
  comments: [],
};

/** Scene 6: the reply that arrives on the new question and becomes its best answer. */
export const roomQuestionAnswer: DemoComment = {
  id: 901,
  author: users.erlangenHelper,
  date: "25 Oct 2026",
  score: 3,
  body: [
    {
      type: "p",
      text: "Keep the dorm application open, there's no guarantee of a place, and also try the Studierendenwerk's free private room service. Never pay a deposit before a viewing and a signed contract.",
    },
  ],
};

type Starter = Pick<DemoThread, "slug" | "title" | "category" | "city" | "excerpt" | "score" | "commentCount" | "relative"> & {
  answered: boolean;
  verified: boolean;
};

function starter(id: number, { answered, verified, ...s }: Starter): DemoThread {
  return {
    id,
    author: users.psaTeam,
    date: "22 Oct 2026",
    body: [],
    verifiedMonth: verified ? "Oct 2026" : null,
    pinned: false,
    outdated: false,
    bestCommentId: answered ? id * 100 + 1 : null,
    comments: [],
    ...s,
  };
}

/** Scene 5's "similar thread" and the moderator's possible duplicate in scene 6. */
export const roomThread: DemoThread = starter(7, {
  slug: "how-do-i-find-a-room-in-erlangen-or-nuremberg-without-getting-scammed",
  title: "How do I find a room in Erlangen or Nuremberg without getting scammed?",
  category: categories.accommodation,
  city: "both",
  excerpt:
    "Finding a room is often the hardest part of moving to Erlangen or Nuremberg. The Studierendenwerk (Student Services) itself says the search is regularly most difficult in the weeks before the winter semester. Start…",
  score: 21,
  commentCount: 6,
  relative: "3 days ago",
  answered: true,
  verified: true,
});

/** The eight starter threads (docs/content/threads, in file order) for feeds and search. */
export const starterThreads: DemoThread[] = [
  anmeldungThread,
  starter(2, {
    slug: "how-do-i-get-or-extend-my-student-residence-permit",
    title: "How do I get or extend my student residence permit in Erlangen or Nuremberg?",
    category: categories.rpVisa,
    city: "both",
    excerpt:
      "Most Pakistani students enter Germany on a national (D) study visa. After arrival, the visa has to be converted into a residence permit for study purposes (§ 16b AufenthG) at the immigration office (Ausländerbehörde) of…",
    score: 18,
    commentCount: 5,
    relative: "3 days ago",
    answered: true,
    verified: true,
  }),
  starter(3, {
    slug: "how-much-money-do-i-need-in-a-blocked-account",
    title: "How much money do I need in a blocked account (Sperrkonto) for a German student visa from Pakistan?",
    category: categories.rpVisa,
    city: null,
    excerpt:
      "For a German study visa you have to show that you can pay your living costs. The most common way is a blocked account (Sperrkonto). Amounts change, so always check the embassy page on the day you transfer money. The…",
    score: 15,
    commentCount: 4,
    relative: "3 days ago",
    answered: false,
    verified: true,
  }),
  starter(4, {
    slug: "which-health-insurance-do-i-need-to-enrol-at-fau",
    title: "Which health insurance do I need to enrol at FAU: public or private?",
    category: categories.firstSteps,
    city: null,
    excerpt:
      "You cannot enrol at FAU without sorting out health insurance first. This summary covers the rules FAU and the law describe; the decision for your case is made by a German statutory insurer (gesetzliche Krankenkasse).…",
    score: 12,
    commentCount: 2,
    relative: "3 days ago",
    answered: true,
    verified: false,
  }),
  starter(5, {
    slug: "is-there-a-semester-ticket-at-fau",
    title: "Is there a semester ticket at FAU? How the discounted Deutschlandticket for students works",
    category: categories.firstSteps,
    city: "both",
    excerpt:
      "Short answer: FAU has no semester ticket any more. Since the winter semester 2023/24, FAU students instead have the option to buy a discounted Deutschlandticket. It is not included in the semester fee, so you decide…",
    score: 9,
    commentCount: 1,
    relative: "3 days ago",
    answered: false,
    verified: false,
  }),
  starter(6, {
    slug: "how-much-can-non-eu-students-work-in-germany",
    title: "How much can non-EU students work in Germany (140 days rule), and what is a Werkstudent job?",
    category: categories.jobs,
    city: null,
    excerpt:
      "Many of us want to work next to our studies. As a non-EU student on a study residence permit (§ 16b AufenthG) you may work, but only within a yearly limit. This is a summary of the law and FAU's guidance; for your own…",
    score: 11,
    commentCount: 3,
    relative: "3 days ago",
    answered: true,
    verified: false,
  }),
  roomThread,
  starter(8, {
    slug: "do-students-have-to-pay-the-rundfunkbeitrag",
    title: "Do students have to pay the Rundfunkbeitrag (broadcasting fee)?",
    category: categories.other,
    city: null,
    excerpt:
      "If you get a letter from the \"ARD ZDF Deutschlandradio Beitragsservice\", it is about the Rundfunkbeitrag, the public broadcasting fee. It is a real, official contribution, and it applies to students too. The basics (as…",
    score: 6,
    commentCount: 2,
    relative: "3 days ago",
    answered: false,
    verified: false,
  }),
];

/** Guides as the sidebar and Start here list them. */
export const guides = [
  { slug: "first-weeks-in-erlangen", title: "First weeks in Erlangen", stepCount: 8 },
  { slug: "first-weeks-in-nuremberg", title: "First weeks in Nuremberg", stepCount: 8 },
];

/** The pinned announcement (announcement bar, sidebar card, hero pill). */
export const announcement = { title: "Welcome to the PSA FAU Community Forum", pinned: true, relative: "3 days ago" };
