import Link from "next/link";

import { cn } from "./cn";

const frame = "inline-flex max-w-full gap-0.5 rounded-lg border border-border bg-surface p-0.5";

function segmentClasses(active: boolean): string {
  return cn(
    "inline-flex min-h-8 items-center whitespace-nowrap rounded-md px-3 text-meta font-medium transition-colors duration-150 pointer-coarse:min-h-11",
    active
      ? "bg-background text-foreground shadow-[0_1px_2px_var(--shadow-color)] ring-1 ring-border"
      : "text-muted hover:text-foreground",
  );
}

export type SegmentedOption<T extends string> = { value: T; label: string };

/** Mutually exclusive toggle, e.g. Write/Preview. */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className={frame}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className={segmentClasses(option.value === value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Filter or tab bar that navigates; the current link carries `aria-current`. */
export function SegmentedLinks({
  label,
  items,
  className,
}: {
  label: string;
  items: readonly { href: string; label: string; current: boolean }[];
  className?: string;
}) {
  return (
    <nav aria-label={label} className={className}>
      <ul className={frame}>
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} aria-current={item.current ? "page" : undefined} className={segmentClasses(item.current)}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
