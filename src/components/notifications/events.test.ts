import { describe, expect, it, vi } from "vitest";

import { announceNotificationsChanged, NOTIFICATIONS_CHANGED } from "./events";

describe("announceNotificationsChanged", () => {
  it("dispatches the event on window", () => {
    const listener = vi.fn();
    window.addEventListener(NOTIFICATIONS_CHANGED, listener);
    announceNotificationsChanged();
    window.removeEventListener(NOTIFICATIONS_CHANGED, listener);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
