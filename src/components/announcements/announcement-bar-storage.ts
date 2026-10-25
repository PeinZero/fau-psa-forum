export const DISMISSED_KEY = "psa-announcement-bar-dismissed";
export const BAR_ID = "announcement-bar";
const KEEP = 20;

export function parseDismissed(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is number => typeof id === "number") : [];
  } catch {
    return [];
  }
}

export function readDismissedRaw(): string | null {
  try {
    return window.localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

export function rememberDismissed(id: number): void {
  try {
    const next = [...parseDismissed(readDismissedRaw()).filter((x) => x !== id), id].slice(-KEEP);
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable: the bar still closes for this page view.
  }
}

/** Runs while the HTML is parsed, before first paint, so a dismissed bar never flashes and nothing shifts. */
export function dismissedScript(id: number): string {
  return `try{var d=JSON.parse(localStorage.getItem(${JSON.stringify(DISMISSED_KEY)})||"[]");if(d.indexOf(${id})>-1)document.getElementById(${JSON.stringify(BAR_ID)}).setAttribute("data-dismissed","")}catch(e){}`;
}
