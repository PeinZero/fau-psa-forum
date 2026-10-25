import type { ComponentProps } from "react";

import { cn } from "./cn";

/**
 * `outline` is the framed card for forms and panels; `quiet` is a borderless step up to `surface`
 * (prompts, side notes); `list` holds rows separated by hairlines, e.g. a moderation queue.
 */
export type CardVariant = "outline" | "quiet" | "list";

export type CardStyleProps = {
  variant?: CardVariant;
  /** Hover look of an interactive card (fill steps to `surface-hover`). */
  hover?: boolean;
  /** Defaults to `md`, except for `list`, whose rows bring their own padding. */
  padding?: "none" | "md";
  className?: string;
};

const variants: Record<CardVariant, string> = {
  outline: "border border-border bg-surface",
  quiet: "bg-surface",
  list: "overflow-hidden bg-surface divide-y divide-border",
};

export function cardClasses({ variant = "outline", hover = false, padding, className }: CardStyleProps = {}): string {
  const pad = padding ?? (variant === "list" ? "none" : "md");
  return cn(
    "block rounded-xl",
    variants[variant],
    pad === "md" && "p-5",
    hover && "bg-surface-hover",
    hover && variant === "outline" && "border-border-strong/50",
    className,
  );
}

export function Card({ variant, hover, padding, className, ...props }: ComponentProps<"div"> & CardStyleProps) {
  return <div className={cardClasses({ variant, hover, padding, className })} {...props} />;
}
