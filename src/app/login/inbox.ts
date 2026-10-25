export type Inbox = { name: string; url: string };

const PROVIDERS: ReadonlyArray<{ domains: readonly string[]; inbox: Inbox }> = [
  { domains: ["gmail.com", "googlemail.com"], inbox: { name: "Gmail", url: "https://mail.google.com/mail/u/0/#inbox" } },
  {
    domains: ["outlook.com", "outlook.de", "hotmail.com", "hotmail.de", "live.com", "live.de", "msn.com"],
    inbox: { name: "Outlook", url: "https://outlook.live.com/mail/" },
  },
  { domains: ["gmx.de", "gmx.net", "gmx.at", "gmx.ch"], inbox: { name: "GMX", url: "https://www.gmx.net/" } },
  { domains: ["web.de"], inbox: { name: "WEB.DE", url: "https://web.de/" } },
  { domains: ["yahoo.com", "yahoo.de"], inbox: { name: "Yahoo Mail", url: "https://mail.yahoo.com/" } },
  { domains: ["icloud.com", "me.com", "mac.com"], inbox: { name: "iCloud Mail", url: "https://www.icloud.com/mail" } },
  { domains: ["proton.me", "protonmail.com"], inbox: { name: "Proton Mail", url: "https://mail.proton.me/" } },
];

/** A webmail link for well-known providers, so the "check your inbox" step is one tap. */
export function inboxFor(email: string): Inbox | null {
  const domain = email.trim().toLowerCase().split("@")[1];
  if (!domain) return null;
  return PROVIDERS.find((provider) => provider.domains.includes(domain))?.inbox ?? null;
}
