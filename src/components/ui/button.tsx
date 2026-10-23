import type { ComponentProps } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "icon";

const base =
  "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium " +
  "transition-[background-color,border-color,color,box-shadow,translate] duration-150 ease-out " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 " +
  "[&_svg]:size-4 [&_svg]:shrink-0";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_1px_2px_var(--shadow-color)] hover:bg-accent-hover",
  secondary:
    "border border-border bg-surface text-foreground shadow-[0_1px_2px_var(--shadow-color)] hover:border-border-strong/60 hover:bg-surface-hover",
  ghost: "text-muted hover:bg-surface-hover hover:text-foreground",
  danger: "border border-danger/25 bg-danger/10 text-danger hover:border-danger/40 hover:bg-danger/15",
};

// Compact on mouse, 44px on touch screens.
const sizes: Record<ButtonSize, string> = {
  sm: "min-h-8 px-3 text-meta pointer-coarse:min-h-11",
  md: "min-h-9 px-4 text-sm pointer-coarse:min-h-11",
  icon: "size-9 pointer-coarse:size-11",
};

export type ButtonStyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

/** Button look for elements that are not a <button>, e.g. `<Link className={buttonClasses()}>`. */
export function buttonClasses({ variant = "primary", size = "md", className }: ButtonStyleProps = {}): string {
  return cn(base, variants[variant], sizes[size], className);
}

export type ButtonProps = ComponentProps<"button"> & ButtonStyleProps;

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}
