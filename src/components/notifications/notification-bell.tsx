"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { buttonClasses } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { NOTIFICATIONS_CHANGED } from "./events";

function badgeText(count: number): string {
  return count > 99 ? "99+" : String(count);
}

export function NotificationBell({ userId, initialUnread }: { userId: string; initialUnread: number }) {
  const [count, setCount] = useState(initialUnread);
  const [serverCount, setServerCount] = useState(initialUnread);
  const [announcement, setAnnouncement] = useState("");
  const [pops, setPops] = useState(0);
  const badgeRef = useRef<HTMLSpanElement>(null);
  const countRef = useRef(count);
  const channelSuffix = useId().replace(/[^a-zA-Z0-9]/g, "");

  // A server refresh (e.g. after a server action) brings a fresh count from the header.
  if (initialUnread !== serverCount) {
    setServerCount(initialUnread);
    setCount(initialUnread);
  }

  useEffect(() => {
    countRef.current = count;
  }, [count]);

  const resync = useCallback(async () => {
    const { count: unread, error } = await createClient()
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .is("read_at", null);
    if (!error && unread !== null) setCount(unread);
  }, [userId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}:${channelSuffix}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
        () => {
          countRef.current += 1;
          setCount(countRef.current);
          setAnnouncement(`New notification. ${countRef.current} unread.`);
          setPops((p) => p + 1);
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void resync();
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, channelSuffix, resync]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void resync();
    };
    const onChange = () => void resync();
    window.addEventListener("focus", onChange);
    window.addEventListener(NOTIFICATIONS_CHANGED, onChange);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onChange);
      window.removeEventListener(NOTIFICATIONS_CHANGED, onChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [resync]);

  useEffect(() => {
    if (pops === 0 || !badgeRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    badgeRef.current.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.3)" }, { transform: "scale(1)" }],
      { duration: 320, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    );
  }, [pops]);

  return (
    <>
      <Link
        href="/notifications"
        aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
        className={buttonClasses({ variant: "ghost", size: "icon", className: "relative" })}
      >
        <Bell strokeWidth={1.75} aria-hidden />
        {count > 0 && (
          <span
            ref={badgeRef}
            aria-hidden
            className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-none tabular-nums text-accent-foreground ring-2 ring-background pointer-coarse:right-1.5 pointer-coarse:top-1.5"
          >
            {badgeText(count)}
          </span>
        )}
      </Link>
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </>
  );
}
