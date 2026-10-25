import { founders } from "@/lib/team";

/**
 * Who runs the forum, as shown on /impressum and /privacy.
 *
 * The two founders are named as jointly responsible. Still to fill in: a postal address where
 * letters actually reach them (ladungsfähige Anschrift: street and house number, postcode, city;
 * a P.O. box is not enough). While it is null, both pages show the names and a note that the
 * address follows. Changing anything here or in the page texts: update `lastUpdated`.
 *
 * Disclaimer: the Impressum and privacy texts are a best-effort template written for a free,
 * non-commercial community forum. They are not legal advice and should be reviewed by someone
 * qualified (for example the FAU legal office or a data protection advisor) before a wide launch.
 */
export const operator = {
  names: founders.map((founder) => founder.name) as readonly string[],
  street: null as string | null,
  postcode: null as string | null,
  city: null as string | null,
  country: "Germany",
  email: "psa.community.forum@gmail.com",
};

/** ISO date; shown on both pages. */
export const lastUpdated = "2026-10-25";

export function formatLegalDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(new Date(iso));
}

export function joinNames(names: readonly string[]): string {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export type CompleteOperator = typeof operator & { street: string; postcode: string; city: string };

/** The operator with a full postal address, or null while the address is missing. */
export function completeOperator(): CompleteOperator | null {
  const { street, postcode, city } = operator;
  return street && postcode && city ? { ...operator, street, postcode, city } : null;
}
