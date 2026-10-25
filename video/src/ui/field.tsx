import { ChevronDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "./cn";

/*
 * The site's form fields (src/components/ui/field.tsx) as static boxes: scenes type into them by
 * passing the typed text as `value` and toggle `focused` for the emerald focus ring.
 */

const fieldBase = "w-full rounded-md border bg-surface px-3 text-foreground";

/** Field box look; phones use 16px text (below that iOS zooms into the field). */
export function fieldClasses({
  focused = false,
  touch = false,
  className,
}: { focused?: boolean; touch?: boolean; className?: string } = {}): string {
  return cn(
    fieldBase,
    touch ? "text-base" : "text-sm",
    focused ? "border-ring ring-3 ring-ring/20" : "border-border-strong",
    className,
  );
}

type FieldProps = {
  /** Typed text; empty shows the placeholder. */
  value?: ReactNode;
  placeholder?: string;
  /** Focus look: ring-colored border plus a soft 3px ring. */
  focused?: boolean;
  /** Draws a text caret after the value (scenes blink it via `caretVisible`). */
  caret?: boolean;
  caretVisible?: boolean;
  touch?: boolean;
  className?: string;
};

function Caret({ visible }: { visible: boolean }) {
  return (
    <span
      aria-hidden
      className="ml-px inline-block h-[1.1em] w-px translate-y-[0.15em] bg-foreground align-baseline"
      style={{ opacity: visible ? 1 : 0 }}
    />
  );
}

function Content({ value, placeholder, caret, caretVisible = true }: FieldProps) {
  const empty = value === undefined || value === null || value === "";
  return (
    <>
      {empty ? null : value}
      {caret && <Caret visible={caretVisible} />}
      {empty && placeholder ? <span className="text-subtle">{placeholder}</span> : null}
    </>
  );
}

/** Single-line input: 36px tall with 14px text (44px and 16px on touch). */
export function Input(props: FieldProps) {
  const { focused, touch, className } = props;
  return (
    <div className={fieldClasses({ focused, touch, className: cn("flex items-center py-1.5", touch ? "min-h-11" : "min-h-9", className) })}>
      <span className="min-w-0 truncate whitespace-pre">
        <Content {...props} />
      </span>
    </div>
  );
}

/** Multi-line textarea: at least 112px tall, relaxed leading. */
export function Textarea(props: FieldProps) {
  const { focused, touch, className } = props;
  return (
    <div className={fieldClasses({ focused, touch, className: cn("min-h-28 py-2 leading-relaxed whitespace-pre-wrap", className) })}>
      <Content {...props} />
    </div>
  );
}

/** Native-select look with the trailing chevron. */
export function Select({ value, placeholder, focused, touch, className }: FieldProps) {
  return (
    <div className={cn("relative", className)}>
      <div className={fieldClasses({ focused, touch, className: cn("flex items-center py-1.5 pr-9", touch ? "min-h-11" : "min-h-9") })}>
        {value ?? <span className="text-subtle">{placeholder}</span>}
      </div>
      <ChevronDown
        aria-hidden
        strokeWidth={1.75}
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
      />
    </div>
  );
}

export function Label({ className, ...props }: ComponentProps<"span">) {
  return <span className={cn("block text-meta font-medium text-foreground", className)} {...props} />;
}
