"use client";

import { useEffect } from "react";

import { markAnnouncementsSeen } from "@/app/announcements/actions";

import { refreshUnseenAnnouncements, writeLocalSeenAt } from "./unseen-store";

/** Rendering /announcements counts as reading everything posted so far. */
export function MarkAnnouncementsSeen() {
  useEffect(() => {
    void (async () => {
      const signedIn = await markAnnouncementsSeen().catch(() => false);
      if (!signedIn) writeLocalSeenAt(new Date().toISOString());
      await refreshUnseenAnnouncements();
    })();
  }, []);
  return null;
}
