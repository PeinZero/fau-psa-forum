"use client";

import { CheckCheck } from "lucide-react";
import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";

import { announceNotificationsChanged } from "@/components/notifications/events";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { markAllNotificationsRead, markNotificationRead } from "./actions";

export function MarkAllReadButton({ disabled }: { disabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <Button
        variant="secondary"
        size="sm"
        disabled={disabled || pending}
        aria-describedby={error ? "mark-all-error" : undefined}
        onClick={() =>
          startTransition(async () => {
            const result = await markAllNotificationsRead();
            setError(result?.ok ? undefined : result?.message);
            if (result?.ok) announceNotificationsChanged();
          })
        }
      >
        <CheckCheck strokeWidth={1.75} />
        {pending ? "Marking…" : "Mark all as read"}
      </Button>
      <FieldError id="mark-all-error" message={error} />
    </div>
  );
}

/**
 * Opening an unread notification marks it read in the background while navigation proceeds.
 * Revalidating would re-render the list mid-navigation, so the item drops its own `data-unread`
 * (which the row styles from) and stays read when the visitor comes back.
 */
export function NotificationLink({
  id,
  href,
  unread,
  className,
  children,
}: {
  id: number;
  /** Omitted when there is nothing to open; the row then only marks itself read. */
  href?: string;
  unread: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [opened, setOpened] = useState(false);
  const onClick = () => {
    if (!unread || opened) return;
    setOpened(true);
    void markNotificationRead(id).then((result) => {
      if (result?.ok) announceNotificationsChanged();
      else setOpened(false);
    });
  };
  const dataUnread = unread && !opened ? "" : undefined;

  if (href === undefined) {
    // Nothing to open, so an unread row is itself the control that marks it read.
    const markable = dataUnread !== undefined;
    return (
      <div
        className={className}
        data-unread={dataUnread}
        onClick={onClick}
        role={markable ? "button" : undefined}
        tabIndex={markable ? 0 : undefined}
        onKeyDown={(event) => {
          if (!markable || (event.key !== "Enter" && event.key !== " ")) return;
          event.preventDefault();
          onClick();
        }}
      >
        {children}
      </div>
    );
  }
  return (
    <Link href={href} className={className} data-unread={dataUnread} onClick={onClick}>
      {children}
    </Link>
  );
}
