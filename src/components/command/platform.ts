"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const isApple = () => /mac|iphone|ipad/i.test(navigator.platform);

/** Null during server render, so shortcut hints appear only after hydration. */
export function useIsApple(): boolean | null {
  return useSyncExternalStore(subscribe, isApple, () => null);
}
