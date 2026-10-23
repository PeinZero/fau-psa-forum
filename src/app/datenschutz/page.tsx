import type { Metadata } from "next";

export const metadata: Metadata = { title: "Datenschutz" };

export default function DatenschutzPage() {
  return (
    <article className="flex flex-col gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">Datenschutz</h1>
      <p className="rounded-md border border-border p-4 text-muted">
        TODO (site owner): Write the privacy policy (Datenschutzerklärung)
        required by the GDPR. It must name the controller and cover hosting,
        server logs, sign-in and account data, and comments. This page is a
        placeholder.
      </p>
    </article>
  );
}
