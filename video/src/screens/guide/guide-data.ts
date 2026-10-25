/* The guide "First weeks in Erlangen" exactly as docs/content/guides/first-weeks-in-erlangen.md publishes it. */

export type GuideStep = { title: string };

export const firstWeeksGuide = {
  slug: "first-weeks-in-erlangen",
  title: "First weeks in Erlangen",
  summary:
    "The paperwork for your first weeks as a non-EU student living in Erlangen, in a sensible order, with a thread for each step.",
  steps: [
    { title: "Find a room and get the landlord's confirmation" },
    { title: "Register your address within two weeks" },
    { title: "Sort out health insurance, then enrol" },
    { title: "Activate your blocked account" },
    { title: "Apply for your residence permit" },
    { title: "Get the discounted Deutschlandticket" },
    { title: "Sort out the broadcasting fee" },
    { title: "Before your first job: know the 140-day rule" },
  ] satisfies GuideStep[],
};

/** The guide page's own count, "3 of 8 done" (GuideProgressSummary in src/components/guides/guide-progress.tsx). */
export function progressLabel(total: number): string {
  return `of ${total} done`;
}
