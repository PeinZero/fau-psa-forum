"use client";

import type { ComponentProps } from "react";

import { refreshUnseenAnnouncements } from "@/components/announcements/unseen-store";

import { ActionButton } from "./action-button";
import { moderateAnnouncement } from "./actions";

/** Pin, unpin or delete an announcement; deleting can change the header's unseen count. */
export function AnnouncementActionButton(props: Omit<ComponentProps<typeof ActionButton>, "action" | "onDone">) {
  return <ActionButton {...props} action={moderateAnnouncement} onDone={() => void refreshUnseenAnnouncements()} />;
}
