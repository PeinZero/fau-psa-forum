import Link from "next/link";
import { Suspense } from "react";

import { NotificationSettings } from "@/components/notification-settings/notification-settings";
import { EMAIL_FREQUENCIES, type EmailFrequency } from "@/components/notification-settings/types";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getViewer, isModerator } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Notification settings" };

async function Content() {
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <Card className="text-sm">
        <Link
          href="/login?next=/account/notifications"
          className="font-medium text-accent underline underline-offset-2"
        >
          Sign in
        </Link>{" "}
        to manage your notifications.
      </Card>
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("muted_types, email_frequency")
    .eq("user_id", viewer.userId)
    .maybeSingle();
  if (error) {
    return (
      <p role="alert" className="text-sm text-danger">
        Could not load your notification settings.
      </p>
    );
  }

  const frequency = EMAIL_FREQUENCIES.find((f) => f === data?.email_frequency) ?? "off";
  return (
    <NotificationSettings
      initialMuted={(data?.muted_types ?? []) as string[]}
      initialFrequency={frequency as EmailFrequency}
      isModerator={isModerator(viewer.role)}
    />
  );
}

export default function NotificationSettingsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <PageHeader
        title="Notification settings"
        description="Choose which notifications you receive. Changes save automatically."
      />
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <Content />
      </Suspense>
    </div>
  );
}
