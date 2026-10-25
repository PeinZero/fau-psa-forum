import { cn } from "./cn";

const activeLook = "bg-raised shadow-[0_1px_2px_var(--shadow-color)] ring-1 ring-border";

const frame = "inline-flex max-w-full gap-0.5 rounded-lg border border-border bg-surface p-0.5";

function segmentClasses(active: boolean, hover: boolean, touch: boolean): string {
  return cn(
    "inline-flex items-center whitespace-nowrap rounded-md px-3 text-meta font-medium",
    touch ? "min-h-11" : "min-h-8",
    active ? cn(activeLook, "text-foreground") : hover ? "text-foreground" : "text-muted",
  );
}

export type SegmentedOption<T extends string> = { value: T; label: string };

/**
 * The site's segmented frame (Hot/New/Top/Active tabs, All cities/Erlangen/Nuremberg, Top/Newest,
 * Write/Preview). Scenes switch `value` to move the raised segment.
 */
export function SegmentedControl<T extends string>({
  value,
  options,
  hover,
  touch = false,
  className,
}: {
  /** The selected segment. */
  value: T;
  options: readonly SegmentedOption<T>[];
  /** A segment under the film's cursor (text steps to foreground). */
  hover?: T;
  touch?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(frame, className)}>
      {options.map((option) => (
        <span
          key={option.value}
          data-segment={option.value}
          className={segmentClasses(option.value === value, option.value === hover, touch)}
        >
          {option.label}
        </span>
      ))}
    </div>
  );
}
