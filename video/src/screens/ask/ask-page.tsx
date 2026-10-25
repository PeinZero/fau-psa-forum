import { Check, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "../../ui/button";
import { CategoryGlyph } from "../../ui/category-glyph";
import { cn } from "../../ui/cn";
import { Input, Label, Textarea } from "../../ui/field";
import { Kbd } from "../../ui/kbd";
import { SegmentedControl } from "../../ui/segmented-control";
import { type Category, categoryList, type CityKey, cityOptionLabels, NO_CITY_LABEL, roomThread } from "../demo-data";
import { SimilarThreads, type SimilarThreadsProps } from "./similar-threads";

/*
 * The ask page `/new` as a signed-in member sees it (src/app/new/page.tsx with
 * src/components/write/thread-form.tsx): page header, then title with live similar threads,
 * category cards, city chips, details and the submit row. Every interactive look is a prop so a
 * scene can type, hover, pick and submit frame by frame.
 */

export type AskPageProps = {
  /** Text typed into the title so far. */
  title: string;
  titleFocused?: boolean;
  caretVisible?: boolean;
  similar?: Omit<SimilarThreadsProps, "threads">;
  /** Category slug that is checked, and how far its checked look has faded in (0 → 1). */
  category?: { slug: string; t: number } | null;
  /** Category card under the film's cursor, with how far its hover look is in. */
  categoryHover?: { slug: string; t: number } | null;
  /** City choice: "" is "Not city-specific" (the form's default). `t` fades the new choice in. */
  city?: { value: CityKey | ""; previous?: CityKey | ""; t: number };
  cityHover?: { value: CityKey | ""; t: number } | null;
  body: string;
  /** Submit button state; `pending` disables the form and shows the spinner. */
  submit?: { hover?: boolean; pressed?: boolean; pending?: boolean; spin?: number };
};

const cityChoices: { value: CityKey | ""; label: string }[] = [
  { value: "", label: NO_CITY_LABEL },
  ...(Object.keys(cityOptionLabels) as CityKey[]).map((key) => ({ value: key, label: cityOptionLabels[key] })),
];

const editorModes = [
  { value: "write", label: "Write" },
  { value: "preview", label: "Preview" },
] as const;

const markdownSyntax = ["**bold**", "*italic*", "[link](url)", "- list", "> quote"];

/** A look that fades in over the element (the site eases these over 150 ms). */
function Layer({ opacity, className }: { opacity: number; className: string }) {
  if (opacity <= 0) return null;
  return <span aria-hidden className={cn("pointer-events-none absolute border", className)} style={{ opacity }} />;
}

export function AskPage({
  title,
  titleFocused = false,
  caretVisible = true,
  similar,
  category = null,
  categoryHover = null,
  city = { value: "", t: 1 },
  cityHover = null,
  body,
  submit = {},
}: AskPageProps) {
  const pending = Boolean(submit.pending);
  return (
    <div className="absolute inset-0 overflow-hidden bg-background">
      <main className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          <div data-anchor="header" className="mb-8">
            <h1 className="text-display font-semibold tracking-tight text-foreground">Ask a question</h1>
            <p className="mt-2 max-w-2xl text-body text-muted">
              Answers stay here for everyone who comes after you. <span className="font-medium text-accent">Search first</span> —
              it may already be answered.
            </p>
          </div>

          <div className="flex flex-col gap-7">
            <div className="flex flex-col gap-1.5">
              <div data-anchor="title" className="flex flex-col gap-1.5">
                <Label>Title</Label>
                <Input
                  value={title}
                  focused={titleFocused}
                  caret={titleFocused}
                  caretVisible={caretVisible}
                  placeholder="e.g. What do I need for the Anmeldung?"
                  className={cn("min-h-10! text-body!", pending && "opacity-50")}
                />
                <div className="flex min-h-5 items-start justify-between gap-3">
                  <p className="text-meta text-muted">Write it the way you would search for it.</p>
                </div>
              </div>
              {similar ? <SimilarThreads threads={[roomThread]} {...similar} /> : null}
            </div>

            <CategoryPicker selected={category} hover={categoryHover} />

            <fieldset data-anchor="city" className="flex min-w-0 flex-col gap-1.5">
              <legend className="mb-1.5 text-meta font-medium text-foreground">City</legend>
              <div className="flex flex-wrap gap-2">
                {cityChoices.map((choice) => (
                  <CityChip
                    key={choice.value}
                    label={choice.label}
                    anchor={`city-${choice.value || "none"}`}
                    checked={choiceWeight(choice.value, city)}
                    hover={cityHover?.value === choice.value ? cityHover.t : 0}
                  />
                ))}
              </div>
            </fieldset>

            <div data-anchor="details" className="flex flex-col gap-1.5">
              <div className="flex items-end justify-between gap-2">
                <Label>Details</Label>
                <SegmentedControl value="write" options={editorModes} />
              </div>
              <Textarea value={body} className={cn("min-h-56!", pending && "opacity-50")} />
              <div className="flex min-h-5 items-start justify-between gap-3">
                <p className="min-w-0 text-meta text-muted">
                  <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    <span>Markdown:</span>
                    {markdownSyntax.map((example) => (
                      <code key={example} className="rounded bg-surface-hover px-1 font-mono text-[0.75rem] text-muted">
                        {example}
                      </code>
                    ))}
                    <span>· @ to mention</span>
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
              <p data-anchor="footnote" className="max-w-sm text-meta text-muted">
                A moderator reviews new threads before they go public. Until then only you and moderators can see it; up to 3 can
                wait at once.
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <span aria-hidden className="inline-flex items-center gap-1 text-meta text-subtle">
                  <Kbd>⌘</Kbd>
                  <Kbd>↵</Kbd>
                </span>
                <Button data-anchor="submit" hover={submit.hover && !pending} pressed={submit.pressed} disabled={pending}>
                  {pending ? <Loader2 aria-hidden style={{ transform: `rotate(${submit.spin ?? 0}deg)` }} /> : null}
                  {pending ? "Submitting…" : "Ask a question"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/** How checked a choice looks: the new value fades in while the previous one fades out. */
function choiceWeight(value: CityKey | "", city: NonNullable<AskPageProps["city"]>): number {
  if (value === city.value) return city.t;
  if (city.previous !== undefined && value === city.previous) return 1 - city.t;
  return 0;
}

function CategoryPicker({ selected, hover }: { selected: AskPageProps["category"]; hover: AskPageProps["categoryHover"] }) {
  const rows = [0, 1, 2].map((row) => categoryList.slice(row * 2, row * 2 + 2));
  return (
    <fieldset className="flex min-w-0 flex-col">
      <legend data-anchor="category-legend" className="mb-3 text-meta font-medium text-foreground">
        Category
      </legend>
      <div className="flex flex-col gap-2">
        {rows.map((pair, row) => (
          <div key={row} className="grid grid-cols-2 gap-2">
            {pair.map((c) => (
              <CategoryCard
                key={c.slug}
                category={c}
                checked={selected?.slug === c.slug ? selected.t : 0}
                hover={hover?.slug === c.slug ? hover.t : 0}
              />
            ))}
          </div>
        ))}
      </div>
    </fieldset>
  );
}

/** A category as a radio card: icon, name, two lines of description, a check when chosen. */
function CategoryCard({ category, checked, hover }: { category: Category; checked: number; hover: number }) {
  const iconColor =
    checked > 0
      ? `color-mix(in oklab, var(--accent) ${Math.round(checked * 100)}%, var(--muted))`
      : `color-mix(in oklab, var(--muted) ${Math.round(hover * 100)}%, var(--subtle))`;
  return (
    <div
      data-anchor={`category-${category.slug}`}
      className="relative flex items-start gap-3 rounded-lg border border-border bg-background px-3 py-2.5"
    >
      <Layer opacity={hover * (1 - checked)} className="-inset-px rounded-lg border-border-strong/60 bg-surface-hover" />
      <Layer opacity={checked} className="-inset-px rounded-lg border-accent/60 bg-accent-soft" />
      <span className="relative mt-0.5 flex" style={{ color: iconColor }}>
        <CategoryGlyph slug={category.slug} />
      </span>
      <span className="relative flex min-w-0 flex-1 flex-col">
        <span className="text-small font-medium text-foreground">{category.name}</span>
        <span className="mt-0.5 line-clamp-2 text-meta text-muted">{category.description}</span>
      </span>
      <Check aria-hidden strokeWidth={2} className="relative mt-0.5 size-4 shrink-0 text-accent" style={{ opacity: checked }} />
    </div>
  );
}

/** A city chip: muted until hovered or chosen, emerald-tinted when chosen. */
function CityChip({ label, anchor, checked, hover }: { label: ReactNode; anchor: string; checked: number; hover: number }) {
  const lift = Math.max(checked, hover);
  return (
    <span
      data-anchor={anchor}
      className="relative inline-flex min-h-8 items-center rounded-full border border-border px-3.5 text-meta font-medium select-none"
      style={{ color: `color-mix(in oklab, var(--foreground) ${Math.round(lift * 100)}%, var(--muted))` }}
    >
      <Layer opacity={hover * (1 - checked)} className="-inset-px rounded-full border-border-strong/60 bg-surface-hover" />
      <Layer opacity={checked} className="-inset-px rounded-full border-accent/50 bg-accent-soft" />
      <span className="relative">{label}</span>
    </span>
  );
}
