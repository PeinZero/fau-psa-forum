import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { completeOperator, formatLegalDate, joinNames, lastUpdated, operator } from "@/lib/legal";

export const legalLinkClass = "font-medium text-accent underline underline-offset-2 [overflow-wrap:anywhere]";

export function LegalPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto w-full max-w-3xl">
      <PageHeader title={title} description={description} className="mb-4" />
      <p className="mb-8 text-meta text-muted">
        Last updated <time dateTime={lastUpdated}>{formatLegalDate(lastUpdated)}</time>
      </p>
      <div className="flex flex-col gap-12 text-body text-muted [&_strong]:font-medium [&_strong]:text-foreground">
        {children}
      </div>
    </article>
  );
}

export function LegalSection({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-heading` : undefined} className="scroll-mt-20 space-y-4">
      <h2 id={id ? `${id}-heading` : undefined} className="text-heading font-semibold text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function LegalSubsection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-body font-semibold text-foreground">{title}</h3>
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

/** Names of the responsible people and their postal address, or a note while the address is missing. */
export function OperatorDetails({ nameOnly = false }: { nameOnly?: boolean }) {
  const names = joinNames(operator.names);
  const details = completeOperator();
  if (!details) {
    return (
      <div className="space-y-3">
        <p className="text-foreground">{names}</p>
        {!nameOnly && (
          <p role="note" className="flex items-start gap-2 rounded-lg bg-warning/10 p-4 text-warning">
            <Info aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0" />
            <span>
              Our postal address will be added soon. Until then, contact us at{" "}
              <a
                href={`mailto:${operator.email}`}
                className="font-medium underline underline-offset-2 [overflow-wrap:anywhere]"
              >
                {operator.email}
              </a>
              .
            </span>
          </p>
        )}
      </div>
    );
  }
  if (nameOnly) return <p className="text-foreground">{names}, address as above</p>;
  return (
    <address className="not-italic text-foreground">
      {names}
      <br />
      {details.street}
      <br />
      {details.postcode} {details.city}
      <br />
      {details.country}
    </address>
  );
}
