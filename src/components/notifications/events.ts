/** Fired on window after notifications were marked read, so the header bell recounts. */
export const NOTIFICATIONS_CHANGED = "notifications:changed";

export function announceNotificationsChanged(): void {
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED));
}
