export type TeamMember = {
  name: string;
  role: string;
  /** Where the card on /contributors leads: a personal site or GitHub profile. */
  link: { href: string; label: string };
  line?: string;
};

export const FOUNDERS_STORY = "Started to stop the same questions getting lost in WhatsApp.";

export const founders: readonly TeamMember[] = [
  {
    name: "Mahad Khalid Tarar",
    role: "Founder",
    link: { href: "https://mahadkhalidtarar.com", label: "mahadkhalidtarar.com" },
  },
  {
    name: "Abdul Moeez",
    role: "Co-founder",
    link: { href: "https://abdulmoeez.com/", label: "abdulmoeez.com" },
  },
];

export type GithubContributor = { login: string; avatarUrl: string; profileUrl: string };

type RawContributor = {
  login: string;
  avatar_url: string;
  html_url: string;
  type?: string;
};

/** Drops bots and the commit counts: the page credits people, it doesn't rank them. */
export function shapeContributors(raw: readonly RawContributor[]): GithubContributor[] {
  return raw
    .filter((c) => c.type !== "Bot" && !c.login.endsWith("[bot]"))
    .map((c) => ({ login: c.login, avatarUrl: c.avatar_url, profileUrl: c.html_url }));
}

export function avatarSrc(url: string, size = 80): string {
  return `${url}${url.includes("?") ? "&" : "?"}s=${size}`;
}
