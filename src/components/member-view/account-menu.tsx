"use client";

import { Eye, UserRound } from "lucide-react";
import { useTransition } from "react";

import { DropdownMenu } from "@/components/ui/dropdown-menu";

import { setMemberView } from "./actions";

/** The avatar menu for moderators: account link and the "View as member" switch. */
export function ModeratorAccountMenu({
  displayName,
  initials,
  viewingAsMember,
}: {
  displayName: string;
  initials: string;
  viewingAsMember: boolean;
}) {
  const [pending, startTransition] = useTransition();

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
        "separator",
        {
          label: "View as member",
          icon: Eye,
          checked: viewingAsMember,
          onSelect: () => startTransition(() => setMemberView(!viewingAsMember)),
        },
      ]}
    />
  );
}
