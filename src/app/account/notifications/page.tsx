import { Suspense } from "react";

import { NotificationSettings } from "@/components/notification-settings/notification-settings";
import { EMAIL_FREQUENCIES, type EmailFrequency } from "@/components/notification-settings/types";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { getViewer, isModerator } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Notification settings" };

async function Content() {
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <SignInRequired next="/account/notifications" title="Sign in to manage notifications">
        Choose which replies, mentions and updates you hear about.
      </SignInRequired>
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
      <p role="alert" className="text-body text-danger">
        Could not load your notification settings.
      </p>
    );
  }

  const frequency = EMAIL_FREQUENCIES.find((f) => f === data?.email_frequency) ?? "off";
  return (
    <NotificationSettings
      // Toggles save without re-rendering the page; a later visit with other stored choices starts over from them.
      key={`${viewer.userId}:${(data?.muted_types ?? []).join()}:${frequency}`}
      initialMuted={(data?.muted_types ?? []) as string[]}
      initialFrequency={frequency as EmailFrequency}
      isModerator={isModerator(viewer.role)}
    />
  );
}

export default function NotificationSettingsPage() {
  return (
    <div className="mx-auto w-full max-w-[45rem]">
      <PageHeader
        title="Notification settings"
        description="Choose which notifications you receive. Changes save automatically."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Content />
      </Suspense>
    </div>
  );
}
