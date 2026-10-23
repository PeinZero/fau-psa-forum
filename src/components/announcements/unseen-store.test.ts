import { describe, expect, it, vi } from "vitest";

const seenAt = { value: "2026-10-01T00:00:00Z" };
const seenReads: Array<() => void> = [];

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "user-1" } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              // Each read sees the "seen" time as it is when the request reaches the database.
              maybeSingle: () =>
                new Promise((resolve) => {
                  const at = seenAt.value;
                  seenReads.push(() => resolve({ data: { announcements_seen_at: at } }));
                }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          gt: async (_column: string, after: string) => ({ count: after < "2026-10-20T00:00:00Z" ? 1 : 0, error: null }),
        }),
      };
    },
  }),
}));

const { refreshUnseenAnnouncements, useUnseenAnnouncements } = await import("./unseen-store");
const { renderHook, act } = await import("@testing-library/react");

describe("refreshUnseenAnnouncements", () => {
  it("reads again when asked while an older read is still running", async () => {
    const { result } = renderHook(() => useUnseenAnnouncements());
    await vi.waitFor(() => expect(seenReads).toHaveLength(1));

    // Opening /announcements marks everything seen while the mount read is still on its way.
    seenAt.value = "2026-10-24T00:00:00Z";
    const refreshed = refreshUnseenAnnouncements();
    await act(async () => seenReads.shift()!());
    await vi.waitFor(() => expect(seenReads).toHaveLength(1));
    await act(async () => {
      seenReads.shift()!();
      await refreshed;
    });

    expect(result.current).toBe(0);
  });
});
