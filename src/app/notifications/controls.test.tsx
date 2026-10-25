import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const markNotificationRead = vi.fn();
vi.mock("./actions", () => ({
  markNotificationRead: (id: number) => markNotificationRead(id),
  markAllNotificationsRead: vi.fn(),
}));
vi.mock("@/components/notifications/events", () => ({ announceNotificationsChanged: vi.fn() }));

import { NotificationLink } from "./controls";

beforeEach(() => {
  markNotificationRead.mockReset().mockResolvedValue({ ok: true });
});

describe("NotificationLink without a target", () => {
  it("lets keyboard users mark an unread notice read", async () => {
    render(
      <NotificationLink id={7} unread>
        Your thread “Anmeldung in Erlangen” was deleted by a moderator.
      </NotificationLink>,
    );
    const row = screen.getByRole("button");
    row.focus();
    await userEvent.keyboard("{Enter}");
    expect(markNotificationRead).toHaveBeenCalledWith(7);
    await waitFor(() => expect(row).not.toHaveAttribute("data-unread"));
  });

  it("is plain text once read", () => {
    render(
      <NotificationLink id={7} unread={false}>
        Your thread “Anmeldung in Erlangen” was deleted by a moderator.
      </NotificationLink>,
    );
    expect(screen.queryByRole("button")).toBeNull();
  });
});
