"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { buttonClasses } from "@/components/ui/button";

const order = ["system", "light", "dark"] as const;
type ThemeChoice = (typeof order)[number];

const labels: Record<ThemeChoice, string> = { system: "System", light: "Light", dark: "Dark" };
const icons = { system: Monitor, light: Sun, dark: Moon } satisfies Record<ThemeChoice, unknown>;

const subscribe = () => () => {};

/** Cycles system → light → dark. The stored choice is unknown on the server, so it renders a placeholder until hydrated. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const classes = buttonClasses({ variant: "ghost", size: "icon", className });

  if (!mounted) {
    return <span aria-hidden className={classes} />;
  }

  const current: ThemeChoice = order.includes(theme as ThemeChoice) ? (theme as ThemeChoice) : "system";
  const next = order[(order.indexOf(current) + 1) % order.length];
  const Icon = icons[current];

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className={classes}
      aria-label={`Theme: ${labels[current]}. Switch to ${labels[next].toLowerCase()}`}
      title={`Theme: ${labels[current]}`}
    >
      <Icon strokeWidth={1.75} />
    </button>
  );
}
