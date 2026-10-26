import { describe, expect, it } from "vitest";

import { Constants } from "@/lib/supabase/database.types";
import { ALL_NOTIFICATION_TYPES, NOTIFICATION_GROUPS } from "./types";

// Account restrictions are always delivered, so they have no switch.
const ALWAYS_ON = ["account_muted", "account_banned", "account_unrestricted"];

describe("NOTIFICATION_GROUPS", () => {
  it("offers a switch for every notification type except account restrictions", () => {
    const switchable = Constants.public.Enums.notification_type.filter((type) => !ALWAYS_ON.includes(type));
    expect([...ALL_NOTIFICATION_TYPES].sort()).toEqual([...switchable].sort());
  });

  it("lists each type once", () => {
    expect(new Set(ALL_NOTIFICATION_TYPES).size).toBe(ALL_NOTIFICATION_TYPES.length);
  });

  it("puts thread edits in the moderator-only group", () => {
    const moderation = NOTIFICATION_GROUPS.find((group) => group.moderatorOnly);
    expect(moderation?.options.find((option) => option.type === "mod_thread_edited")).toEqual({
      type: "mod_thread_edited",
      label: "Thread edited",
      description: "A published thread is edited and waits for review.",
    });
  });
});
