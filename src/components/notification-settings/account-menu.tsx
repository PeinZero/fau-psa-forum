"use client";

import {
  Bell,
  Bookmark,
  Eye,
  FileText,
  Inbox,
  LogOut,
  MessageSquareText,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { FeedbackDialog } from "@/components/feedback/feedback-button";
import { setMemberView } from "@/components/member-view/actions";
import { DropdownMenu } from "@/components/ui/dropdown-menu";

/** Avatar menu for every signed-in user; moderators additionally get the member view switch and moderation. */
export function AccountMenu({
  displayName,
  initials,
  profileHref,
  moderator,
  viewingAsMember,
}: {
  displayName: string;
  initials: string;
  profileHref: string;
  moderator: boolean;
  viewingAsMember: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const signOutRef = useRef<HTMLFormElement>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Menu links stay out of the viewport until it opens, so warm their shells up front.
  useEffect(() => {
    [profileHref, "/me/threads", "/saved", "/notifications", "/account"].forEach((href) => router.prefetch(href));
  }, [router, profileHref]);

  return (
    <>
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
          { label: "My profile", icon: UserRound, href: profileHref },
          { label: "My threads", icon: FileText, href: "/me/threads" },
          { label: "Saved", icon: Bookmark, href: "/saved" },
          "separator",
          { label: "Notifications", icon: Inbox, href: "/notifications" },
          { label: "Notification settings", icon: Bell, href: "/account/notifications" },
          { label: "Account", icon: Settings, href: "/account" },
          moderator && "separator",
          moderator && {
            label: "View as member",
            icon: Eye,
            checked: viewingAsMember,
            onSelect: () => startTransition(() => setMemberView(!viewingAsMember)),
          },
          moderator && { label: "Moderation", icon: ShieldCheck, href: "/mod" },
          "separator",
          { label: "Send feedback", icon: MessageSquareText, onSelect: () => setFeedbackOpen(true) },
          { label: "Sign out", icon: LogOut, onSelect: () => signOutRef.current?.requestSubmit() },
        ]}
      />
      <form ref={signOutRef} action="/auth/signout" method="post" hidden />
      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}
