"use client";

import { useSyncExternalStore } from "react";

import { Kbd } from "@/components/ui/kbd";

const subscribe = () => () => {};
const isApple = () => /mac|iphone|ipad/i.test(navigator.platform);

/** The header search listens for ⌘K / Ctrl+K; the platform is unknown until hydration. */
export function SearchShortcut({ className }: { className?: string }) {
  const apple = useSyncExternalStore(subscribe, isApple, () => null);
  if (apple === null) return null;
  return (
    <span aria-hidden className={className}>
      <Kbd>{apple ? "⌘" : "Ctrl"}</Kbd>
      <Kbd>K</Kbd>
    </span>
  );
}
