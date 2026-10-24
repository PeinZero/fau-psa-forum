import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { completeOperator, formatLegalDate, lastUpdated, operator } from "@/lib/legal";

export const legalLinkClass = "font-medium text-accent underline underline-offset-2 [overflow-wrap:anywhere]";

export function LegalPage({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <PageHeader title={title} description={description} className="mb-6" />
      <p className="mb-8 text-meta text-subtle">
        Last updated <time dateTime={lastUpdated}>{formatLegalDate(lastUpdated)}</time>
      </p>
      <div className="flex flex-col gap-10 text-body text-muted [&_strong]:font-medium [&_strong]:text-foreground">
        {children}
      </div>
    </article>
  );
}

export function LegalSection({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-heading` : undefined} className="scroll-mt-20 space-y-3">
      <h2 id={id ? `${id}-heading` : undefined} className="text-lg font-semibold tracking-tight text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function LegalSubsection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

export function LegalList({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-1.5 pl-5 marker:text-subtle">{children}</ul>;
}

export function EmailLink() {
  return (
    <a href={`mailto:${operator.email}`} className={legalLinkClass}>
      {operator.email}
    </a>
  );
}

/** Name and postal address of the responsible person, or a notice while they are not filled in. */
export function OperatorDetails({ nameOnly = false }: { nameOnly?: boolean }) {
  const details = completeOperator();
  if (!details) {
    return (
      <p
        role="note"
        className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-warning"
      >
        <Info aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0" />
        <span>
          Responsible person: details are being finalised. Until then, contact us at{" "}
          <a href={`mailto:${operator.email}`} className="font-medium underline underline-offset-2 [overflow-wrap:anywhere]">
            {operator.email}
          </a>
          .
        </span>
      </p>
    );
  }
  if (nameOnly) return <p className="text-foreground">{details.name}, address as above</p>;
  return (
    <address className="not-italic text-foreground">
      {details.name}
      <br />
      {details.street}
      <br />
      {details.postcode} {details.city}
      <br />
      {details.country}
    </address>
  );
}
