"use client";

import { Bell, Bookmark, Eye, Megaphone, UserRound } from "lucide-react";
import { useTransition } from "react";

import { unseenLabel, useUnseenAnnouncements } from "@/components/announcements/unseen-store";
import { setMemberView } from "@/components/member-view/actions";
import { DropdownMenu } from "@/components/ui/dropdown-menu";

/** Avatar menu for every signed-in user; moderators additionally get the "View as member" switch. */
export function AccountMenu({
  displayName,
  initials,
  moderator,
  viewingAsMember,
}: {
  displayName: string;
  initials: string;
  moderator: boolean;
  viewingAsMember: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const unseen = useUnseenAnnouncements();

  return (
    <DropdownMenu
      label={`Account menu: ${displayName}${viewingAsMember ? ", viewing as a member" : ""}`}
      heading={displayName}
      busy={pending}
      triggerClassName="group relative inline-flex size-11 items-center justify-center rounded-full max-[399px]:pointer-coarse:size-10"
      trigger={
        <>
          <span
            aria-hidden
            className="flex size-7 items-center justify-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent ring-1 ring-accent/25 transition-shadow duration-150 group-hover:ring-accent/50 group-aria-expanded:ring-accent/60"
          >
            {initials}
          </span>
          {viewingAsMember && (
            <span
              aria-hidden
              className="absolute bottom-1.5 right-1.5 flex size-3.5 items-center justify-center rounded-full bg-background ring-1 ring-border"
            >
              <Eye strokeWidth={2} className="size-2.5! text-muted" />
            </span>
          )}
        </>
      }
      items={[
        { label: "Account", icon: UserRound, href: "/account" },
        { label: "Saved", icon: Bookmark, href: "/saved" },
        {
          label: unseen ? `Announcements (${unseenLabel(unseen)} new)` : "Announcements",
          icon: Megaphone,
          href: "/announcements",
        },
        { label: "Notification settings", icon: Bell, href: "/account/notifications" },
        moderator && "separator",
        moderator && {
          label: "View as member",
          icon: Eye,
          checked: viewingAsMember,
          onSelect: () => startTransition(() => setMemberView(!viewingAsMember)),
        },
      ]}
    />
  );
}
