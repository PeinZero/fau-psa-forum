import type { ComponentProps } from "react";
import { cn } from "./cn";

export type CardStyleProps = {
  /** Hover feedback for cards that are links or buttons. */
  interactive?: boolean;
  padding?: "none" | "md";
  className?: string;
};

/** Card look for links: `<Link className={cardClasses({ interactive: true })}>`. */
export function cardClasses({ interactive = false, padding = "md", className }: CardStyleProps = {}): string {
  return cn(
    "block rounded-xl border border-border bg-surface",
    padding === "md" && "p-4 sm:p-5",
    interactive &&
      "transition-[background-color,border-color,translate,box-shadow] duration-200 ease-out " +
        "hover:-translate-y-px hover:border-border-strong/50 hover:bg-surface-hover " +
        "hover:shadow-[0_4px_16px_-6px_var(--shadow-color)] active:translate-y-0",
    className,
  );
}

export function Card({ interactive, padding, className, ...props }: ComponentProps<"div"> & CardStyleProps) {
  return <div className={cardClasses({ interactive, padding, className })} {...props} />;
}
