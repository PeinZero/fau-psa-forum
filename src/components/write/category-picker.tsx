"use client";

import { Check } from "lucide-react";

import { CategoryGlyph } from "@/components/thread/category-icon";
import { cn } from "@/components/ui/cn";

export type CategoryOption = { id: number; slug: string; name: string; description?: string | null };

/** Categories as radio cards, so the description helps people pick before they choose. */
export function CategoryPicker({
  name,
  categories,
  value,
  onChange,
  describedBy,
  invalid,
}: {
  name: string;
  categories: readonly CategoryOption[];
  value: string;
  onChange: (value: string) => void;
  describedBy?: string;
  invalid?: boolean;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col" aria-describedby={describedBy} aria-invalid={invalid || undefined}>
      <legend className="mb-3 text-meta font-medium text-foreground">
        Category
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {categories.map((category) => {
          const description = category.description?.trim();
          return (
            <label
              key={category.id}
              className={cn(
                "group/choice relative flex cursor-pointer items-start gap-3 rounded-lg border bg-background px-3 py-2.5",
                "transition-[background-color,border-color,box-shadow] duration-150 ease-out",
                invalid ? "border-danger/50" : "border-border",
                "hover:border-border-strong/60 hover:bg-surface-hover",
                "has-checked:border-accent/60 has-checked:bg-accent-soft has-checked:hover:bg-accent-soft",
                "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
              )}
            >
              <input
                type="radio"
                name={name}
                value={category.id}
                checked={value === category.id.toString()}
                onChange={() => onChange(category.id.toString())}
                required
                className="peer sr-only"
              />
              <CategoryGlyph
                slug={category.slug}
                className="mt-0.5 text-subtle transition-colors duration-150 group-hover/choice:text-muted peer-checked:text-accent"
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-medium text-foreground">{category.name}</span>
                {description ? <span className="mt-0.5 line-clamp-2 text-meta text-muted">{description}</span> : null}
              </span>
              <Check
                aria-hidden
                strokeWidth={2}
                className="mt-0.5 size-4 shrink-0 text-accent opacity-0 transition-opacity duration-150 peer-checked:opacity-100"
              />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
