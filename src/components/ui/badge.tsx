import type { ComponentProps } from "react";
import { cn } from "./cn";

export type BadgeVariant = "neutral" | "accent" | "warning" | "danger";

const variants: Record<BadgeVariant, string> = {
  neutral: "border-border bg-surface text-muted",
  accent: "border-accent/20 bg-accent-soft text-accent",
  warning: "border-warning/25 bg-warning/10 text-warning",
  danger: "border-danger/25 bg-danger/10 text-danger",
};

export function Badge({ variant = "neutral", className, ...props }: ComponentProps<"span"> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 text-xs font-medium [&_svg]:size-3",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
