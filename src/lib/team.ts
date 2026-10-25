export type TeamMember = {
  name: string;
  role: string;
  github: string;
  githubHandle: string;
  line?: string;
};

export const FOUNDERS_STORY = "Started to stop the same questions getting lost in WhatsApp.";

export const founders: readonly TeamMember[] = [
  {
    name: "Mahad Khalid Tarar",
    role: "Founder",
    github: "https://github.com/PeinZero",
    githubHandle: "PeinZero",
  },
  {
    name: "Abdul Moeez",
    role: "Co-founder",
    github: "https://github.com/abdulmoeez1225",
    githubHandle: "abdulmoeez1225",
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
