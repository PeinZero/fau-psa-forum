import { Bell, ChevronRight, Download, LogOut, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Avatar } from "@/components/author";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { stagger } from "@/components/ui/motion";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewerRestrictionBanner } from "@/components/restrictions/restriction-banner";
import { getViewer } from "@/lib/auth/viewer";
import { formatDate, statusLabels } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";
import {
  DeleteAccountForm,
  ModeratorApplicationForm,
  ProfileForm,
} from "./forms";

export const metadata = { title: "Your account" };

const statusVariant: Record<Enums<"thread_status">, BadgeVariant> = {
  pending: "warning",
  published: "accent",
  rejected: "danger",
  archived: "neutral",
};

function Section({
  title,
  description,
  action,
  index,
  className,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  index: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Card
      className={`animate-fade-up space-y-4 ${className ?? ""}`}
      style={stagger(index)}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-meta text-muted">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

async function ModeratorSection({
  userId,
  role,
}: {
  userId: string;
  role: string;
}) {
  if (role !== "member") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Your role:{" "}
          <Badge variant="accent">
            {role === "superadmin" ? "Superadmin" : "Moderator"}
          </Badge>
        </p>
        <Link
          href="/mod"
          className={buttonClasses({ variant: "secondary", size: "sm" })}
        >
          Open moderation
          <ChevronRight strokeWidth={1.75} />
        </Link>
      </div>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("moderator_applications")
    .select("status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data?.status === "pending") {
    return (
      <p className="text-sm text-muted">
        <Badge variant="warning">In review</Badge> Your application is being
        reviewed.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {data?.status === "rejected" && (
        <p className="text-sm text-muted">
          Your last application was not accepted. You can apply again.
        </p>
      )}
      <ModeratorApplicationForm />
    </div>
  );
}

async function MyThreads({ userId }: { userId: string }) {
  const supabase = await createClient();
  const { data: threads, error } = await supabase
    .from("threads")
    .select("id, slug, title, status, rejection_reason, created_at")
    .eq("author_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p role="alert" className="text-sm text-danger">
        Could not load your threads.
      </p>
    );
  }
  if (!threads.length)
    return (
      <p className="text-sm text-muted">You have not posted any threads yet.</p>
    );

  return (
    <ul className="-mx-2 divide-y divide-border">
      {threads.map((t) => (
        <li key={t.id}>
          <Link
            href={`/t/${t.slug}`}
            className="block rounded-md px-2 py-2.5 transition-colors duration-150 hover:bg-surface-hover"
          >
            <span className="flex items-start justify-between gap-3">
              <span className="min-w-0 break-words text-sm font-medium text-foreground">
                {t.title}
              </span>
              <Badge variant={statusVariant[t.status]} className="mt-0.5">
                {statusLabels[t.status]}
              </Badge>
            </span>
            <span className="mt-0.5 block text-meta text-muted">
              {formatDate(t.created_at)}
            </span>
            {t.status === "rejected" && t.rejection_reason && (
              <span className="mt-1 block text-meta text-danger">
                Reason: {t.rejection_reason}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function AccountContent() {
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <Card className="text-sm">
        <Link
          href="/login?next=/account"
          className="font-medium text-accent underline underline-offset-2"
        >
          Sign in
        </Link>{" "}
        to manage your account.
      </Card>
    );
  }

  const supabase = await createClient();
  // "*" keeps the page working while the handles migration is not applied yet.
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", viewer.userId)
    .maybeSingle();

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Avatar name={viewer.displayName} size="md" />
            <span className="min-w-0 break-words">{viewer.displayName}</span>
          </span>
        }
        description="Manage your profile, your threads and your account."
        actions={
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="secondary" size="sm">
              <LogOut strokeWidth={1.75} />
              Sign out
            </Button>
          </form>
        }
      />
      <div className="space-y-4">
        <Section title="Profile" index={0}>
          <ProfileForm
            displayName={viewer.displayName}
            username={profile?.username ?? null}
            affiliation={profile?.affiliation ?? null}
          />
        </Section>

        <Section
          title="My threads"
          index={1}
          action={
            <Link
              href="/new"
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              <Plus strokeWidth={1.75} />
              New thread
            </Link>
          }
        >
          <Suspense fallback={<Skeleton className="h-16 w-full" />}>
            <MyThreads userId={viewer.userId} />
          </Suspense>
        </Section>

        <Link
          href="/account/notifications"
          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 transition-colors duration-150 hover:bg-surface-hover sm:p-5"
        >
          <span className="flex min-w-0 items-center gap-3">
            <Bell strokeWidth={1.75} className="size-4 shrink-0 text-muted" aria-hidden />
            <span className="min-w-0">
              <span className="block text-base font-semibold tracking-tight">Notification settings</span>
              <span className="block text-meta text-muted">Choose what you get notified about.</span>
            </span>
          </span>
          <ChevronRight strokeWidth={1.75} className="size-4 shrink-0 text-muted" aria-hidden />
        </Link>

        <Section title="Become a moderator" index={2}>
          <Suspense fallback={<Skeleton className="h-16 w-full" />}>
            <ModeratorSection userId={viewer.userId} role={viewer.role} />
          </Suspense>
        </Section>

        <Section
          title="Your data"
          description="Get a copy of everything the forum stores about you."
          index={3}
        >
          <p className="text-sm text-muted">
            A JSON file with your profile, threads (including pending and rejected), comments, votes,
            bookmarks, follows, notification settings and your latest 500 notifications, reports and
            update requests you filed, moderator applications and guide progress.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {/* A plain link: the route sends the file as an attachment, so no client JS is needed. */}
            <a
              href="/account/export"
              download
              className={buttonClasses({ variant: "secondary", size: "md" })}
            >
              <Download strokeWidth={1.75} />
              Download my data
            </a>
            <span className="text-meta text-muted">Available once every 10 minutes.</span>
          </div>
          <p className="text-meta text-muted">
            To delete your account instead, see the Danger zone below.
          </p>
        </Section>

        <Section
          title="Danger zone"
          description="Deleting your account cannot be undone."
          index={4}
          className="border-danger/30"
        >
          <DeleteAccountForm />
        </Section>
      </div>
    </>
  );
}

export default function AccountPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-10">
      <Suspense fallback={null}>
        <ViewerRestrictionBanner className="mb-6" />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <AccountContent />
      </Suspense>
    </div>
  );
}
