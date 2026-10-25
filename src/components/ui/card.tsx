import type { ComponentProps } from "react";
import { cn } from "./cn";

/**
 * `outline` is the framed card for forms and panels; `quiet` is a borderless step up to `surface`
 * (prompts, side notes); `list` holds rows separated by hairlines, e.g. a moderation queue.
 */
export type CardVariant = "outline" | "quiet" | "list";

export type CardStyleProps = {
  variant?: CardVariant;
  /** Hover feedback for cards that are links or buttons. */
  interactive?: boolean;
  /** Defaults to `md`, except for `list`, whose rows bring their own padding. */
  padding?: "none" | "md";
  className?: string;
};

const variants: Record<CardVariant, string> = {
  outline: "border border-border bg-surface",
  quiet: "bg-surface",
  list: "overflow-hidden bg-surface divide-y divide-border",
};

/** Card look for links: `<Link className={cardClasses({ interactive: true })}>`. */
export function cardClasses({ variant = "outline", interactive = false, padding, className }: CardStyleProps = {}): string {
  const pad = padding ?? (variant === "list" ? "none" : "md");
  return cn(
    "block rounded-xl",
    variants[variant],
    pad === "md" && "p-4 sm:p-5",
    // Cards step their fill on hover like rows do; no lift, no shadow.
    interactive &&
      "transition-[background-color,border-color] duration-150 ease-out hover:bg-surface-hover active:bg-surface-hover/70",
    interactive && variant === "outline" && "hover:border-border-strong/50",
    className,
  );
}

export function Card({ variant, interactive, padding, className, ...props }: ComponentProps<"div"> & CardStyleProps) {
  return <div className={cardClasses({ variant, interactive, padding, className })} {...props} />;
}
