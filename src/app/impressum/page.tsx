import type { Metadata } from "next";

export const metadata: Metadata = { title: "Impressum" };

export default function ImpressumPage() {
  return (
    <article className="flex flex-col gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">Impressum</h1>
      <p className="rounded-md border border-border p-4 text-muted">
        TODO (site owner): Provide the legal information required by § 5 DDG
        here: name and postal address of the responsible person or
        organization, contact email, and, if applicable, the person
        responsible for content under § 18 MStV. This page is a placeholder.
      </p>
    </article>
  );
}
