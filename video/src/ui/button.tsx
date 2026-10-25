import type { ComponentProps } from "react";

import { cn } from "./cn";

/*
 * The site's Button look (src/components/ui/button.tsx). Interaction-only classes (transitions,
 * hover, focus, pointer-coarse) are left out: a film frame has no pointer, and CSS transitions would
 * tween between rendered frames. Hover and touch looks are props instead.
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "icon";

const base =
  "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium " +
  "[&_svg]:size-4 [&_svg]:shrink-0";

const variants: Record<ButtonVariant, { rest: string; hover: string }> = {
  primary: {
    rest: "bg-accent text-accent-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_1px_2px_var(--shadow-color)]",
    hover: "bg-accent-hover text-accent-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_1px_2px_var(--shadow-color)]",
  },
  secondary: {
    rest: "border border-border bg-surface text-foreground shadow-[0_1px_2px_var(--shadow-color)]",
    hover: "border border-border-strong/60 bg-surface-hover text-foreground shadow-[0_1px_2px_var(--shadow-color)]",
  },
  ghost: { rest: "text-muted", hover: "bg-surface-hover text-foreground" },
  danger: {
    rest: "border border-danger/25 bg-danger/10 text-danger",
    hover: "border border-danger/40 bg-danger/15 text-danger",
  },
};

// Compact on mouse, 44px on touch screens (the phone shots pass `touch`).
const sizes: Record<ButtonSize, { mouse: string; touch: string }> = {
  sm: { mouse: "min-h-8 px-3 text-meta", touch: "min-h-11 px-3 text-meta" },
  md: { mouse: "min-h-9 px-4 text-small", touch: "min-h-11 px-4 text-small" },
  icon: { mouse: "size-9", touch: "size-11" },
};

export type ButtonStyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows the hover look, e.g. while the film's cursor rests on the button. */
  hover?: boolean;
  /** Pressed look (the site nudges a pressed button down by 1px). */
  pressed?: boolean;
  /** Disabled look (50% opacity). */
  disabled?: boolean;
  /** 44px touch targets, as on phones. */
  touch?: boolean;
  className?: string;
};

/** Button look for any element, e.g. `<span className={buttonClasses({ variant: "ghost" })}>`. */
export function buttonClasses({
  variant = "primary",
  size = "md",
  hover = false,
  pressed = false,
  disabled = false,
  touch = false,
  className,
}: ButtonStyleProps = {}): string {
  const look = variants[variant];
  return cn(
    base,
    hover ? look.hover : look.rest,
    touch ? sizes[size].touch : sizes[size].mouse,
    pressed && "translate-y-px",
    disabled && "opacity-50",
    className,
  );
}

export type ButtonProps = Omit<ComponentProps<"span">, "className"> & ButtonStyleProps;

/** A non-interactive button: a `<span>` with the site's button look. */
export function Button({ variant, size, hover, pressed, disabled, touch, className, ...props }: ButtonProps) {
  return <span className={buttonClasses({ variant, size, hover, pressed, disabled, touch, className })} {...props} />;
}
