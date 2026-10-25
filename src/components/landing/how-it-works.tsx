import { LandingSection } from "./section";
import { howItWorksSteps } from "./shape";

export function HowItWorks() {
  return (
    <LandingSection
      id="how-it-works"
      title="How it works"
      description="Every answer here was asked by someone in your shoes and checked by people who know."
    >
      <ol className="grid gap-8 md:grid-cols-3 md:gap-6">
        {howItWorksSteps.map(({ title, body, icon: Icon }, i) => (
          <li
            key={title}
            className="relative flex gap-4 md:flex-col md:gap-5 md:not-last:after:absolute md:not-last:after:top-5 md:not-last:after:right-3 md:not-last:after:left-16 md:not-last:after:h-px md:not-last:after:bg-gradient-to-r md:not-last:after:from-border-strong/40 md:not-last:after:to-transparent"
          >
            <span
              aria-hidden
              className="relative flex size-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-accent shadow-[0_1px_2px_var(--shadow-color)]"
            >
              <Icon strokeWidth={1.75} className="size-[1.125rem]" />
            </span>
            <div className="min-w-0">
              <p className="text-meta font-medium tabular-nums text-subtle">Step {i + 1}</p>
              <h3 className="mt-0.5 text-title font-semibold text-foreground">{title}</h3>
              <p className="mt-1 max-w-xs text-small text-pretty text-muted">{body}</p>
            </div>
          </li>
        ))}
      </ol>
    </LandingSection>
  );
}
