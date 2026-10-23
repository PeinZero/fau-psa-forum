import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "./cn";

// 16px text on small screens keeps iOS Safari from zooming into focused fields.
export const fieldClasses =
  "w-full rounded-md border border-border-strong bg-surface px-3 text-base text-foreground sm:text-sm " +
  "transition-[border-color,box-shadow,background-color] duration-150 ease-out " +
  "hover:border-muted focus:border-ring focus:outline-none focus:ring-3 focus:ring-ring/20 " +
  "aria-invalid:border-danger aria-invalid:focus:ring-danger/20 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldClasses, "min-h-9 py-1.5 pointer-coarse:min-h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(fieldClasses, "min-h-28 resize-y py-2 leading-relaxed", className)} {...props} />;
}

/** `className` styles the wrapper (width, margins); the native <select> fills it. */
export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className={cn("relative", className)}>
      <select
        className={cn(fieldClasses, "min-h-9 appearance-none py-1.5 pr-9 pointer-coarse:min-h-11")}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        strokeWidth={1.75}
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
      />
    </div>
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-meta font-medium text-foreground", className)} {...props} />;
}

/** Renders nothing without a message; give the field `aria-describedby={id}` and `aria-invalid`. */
export function FieldError({ id, message, className }: { id: string; message?: string; className?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className={cn("text-meta text-danger", className)}>
      {message}
    </p>
  );
}
