"use client";

import { OPEN_SHORTCUTS_EVENT } from "./shortcuts-dialog";

export function ShortcutsLink({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_SHORTCUTS_EVENT))}>
      Keyboard shortcuts
    </button>
  );
}
