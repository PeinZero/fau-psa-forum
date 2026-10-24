/**
 * Who runs the forum, as shown on /impressum and /privacy.
 *
 * To fill in: the responsible person's full name and a postal address where letters actually
 * reach them (ladungsfähige Anschrift: street and house number, postcode, city; a P.O. box is
 * not enough). While `name` or the address is null, both pages show a "details are being
 * finalised" notice instead. Changing anything here or in the page texts: update `lastUpdated`.
 *
 * Disclaimer: the Impressum and privacy texts are a best-effort template written for a free,
 * non-commercial community forum. They are not legal advice and should be reviewed by someone
 * qualified (for example the FAU legal office or a data protection advisor) before a wide launch.
 */
export const operator = {
  name: null as string | null,
  street: null as string | null,
  postcode: null as string | null,
  city: null as string | null,
  country: "Germany",
  email: "psa.community.forum@gmail.com",
};

/** ISO date; shown on both pages. */
export const lastUpdated = "2026-10-24";

export function formatLegalDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(new Date(iso));
}

export type CompleteOperator = typeof operator & { name: string; street: string; postcode: string; city: string };

export function completeOperator(): CompleteOperator | null {
  const { name, street, postcode, city } = operator;
  return name && street && postcode && city ? { ...operator, name, street, postcode, city } : null;
}
