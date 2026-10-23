import Link from "next/link";

import { LinkPending } from "@/components/layout/link-pending";

import { cn } from "./cn";

const activeLook = "bg-background shadow-[0_1px_2px_var(--shadow-color)] ring-1 ring-border";

const frame = "inline-flex max-w-full gap-0.5 rounded-lg border border-border bg-surface p-0.5";

function segmentClasses(active: boolean): string {
  return cn(
    "inline-flex min-h-8 items-center whitespace-nowrap rounded-md px-3 text-meta font-medium transition-colors duration-150 pointer-coarse:min-h-11",
    active ? cn(activeLook, "text-foreground") : "text-muted hover:text-foreground",
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

/**
 * Filter or tab bar that navigates; the current link carries `aria-current`.
 * A clicked tab looks selected straight away while its page streams in.
 */
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
      <ul className={cn(frame, "group/segments")}>
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              className={cn(
                segmentClasses(item.current),
                "relative isolate has-data-pending:text-foreground",
                item.current &&
                  "group-has-data-pending/segments:bg-transparent group-has-data-pending/segments:text-muted group-has-data-pending/segments:shadow-none group-has-data-pending/segments:ring-0",
              )}
            >
              {item.label}
              <LinkPending className={activeLook} />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
