import { ArrowRight, Megaphone } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";

import { announcementHref } from "./data";
import { DismissibleBanner } from "./dismissible-banner";

async function LatestPinned({ className }: { className?: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("announcements")
    .select("id, title")
    .eq("is_pinned", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;

  return (
    <DismissibleBanner announcementId={data.id} className={className}>
      <Megaphone aria-hidden strokeWidth={1.75} className="size-4 shrink-0 text-accent" />
      <p className="min-w-0 flex-1 truncate font-medium text-foreground">{data.title}</p>
      <Link
        href={announcementHref(data.id)}
        className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-md px-2 font-medium text-accent transition-colors duration-150 hover:bg-accent/10 pointer-coarse:min-h-11"
      >
        Read
        <span className="sr-only">: {data.title}</span>
        <ArrowRight aria-hidden strokeWidth={1.75} className="size-3.5" />
      </Link>
    </DismissibleBanner>
  );
}

/**
 * The newest pinned announcement as a slim banner. Renders nothing when none is pinned or the
 * visitor dismissed it, so spacing belongs in `className` rather than a wrapper.
 */
export function LatestAnnouncementBanner({ className }: { className?: string }) {
  return (
    <Suspense fallback={null}>
      <LatestPinned className={className} />
    </Suspense>
  );
}
