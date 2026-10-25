import { Bell, ChevronRight, Download, FileText, LogOut, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Avatar } from "@/components/author";
import { SignInRequired } from "@/components/auth/sign-in-required";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { stagger } from "@/components/ui/motion";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ViewerRestrictionBanner } from "@/components/restrictions/restriction-banner";
import { getViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import {
  DeleteAccountForm,
  ModeratorApplicationForm,
  ProfileForm,
} from "./forms";

export const metadata = { title: "Your account" };

function Section({
  id,
  title,
  description,
  index,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  index: number;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="animate-fade-up" style={stagger(index)}>
      <h2 id={id} className="text-heading font-semibold text-foreground">
        {title}
      </h2>
      {description ? <p className="mt-1 text-body text-muted">{description}</p> : null}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
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
        <p className="text-body text-muted">
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
      <p className="text-body text-muted">
        <Badge variant="warning">In review</Badge> Your application is being
        reviewed.
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {data?.status === "rejected" && (
        <p className="text-body text-muted">
          Your last application was not accepted. You can apply again.
        </p>
      )}
      <ModeratorApplicationForm />
    </div>
  );
}

function LinkRow({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group -mx-3 flex items-center justify-between gap-3 rounded-lg px-3 py-3 transition-colors duration-150 ease-out hover:bg-surface-hover sm:-mx-4 sm:px-4"
      >
        <span className="flex min-w-0 items-center gap-3">
          <Icon strokeWidth={1.75} className="size-4 shrink-0 text-subtle" aria-hidden />
          <span className="min-w-0">
            <span className="block text-body font-medium text-foreground">{title}</span>
            <span className="block text-meta text-muted">{description}</span>
          </span>
        </span>
        <ChevronRight
          strokeWidth={1.75}
          className="size-4 shrink-0 text-subtle transition-transform duration-150 ease-out group-hover:translate-x-0.5"
          aria-hidden
        />
      </Link>
    </li>
  );
}

async function AccountContent() {
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <SignInRequired next="/account" title="Sign in to manage your account">
        Your profile, notification settings and data live here.
      </SignInRequired>
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
        title="Your account"
        description="Manage your profile, notifications and data."
        actions={
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="secondary" size="sm">
              <LogOut strokeWidth={1.75} />
              Sign out
            </Button>
          </form>
        }
      />
      <div className="flex flex-col gap-12">
        <Section id="account-profile" title="Profile" index={0}>
          <div className="flex items-center gap-4">
            <Avatar name={viewer.displayName} size="lg" />
            <div className="min-w-0">
              <p className="break-words text-title font-semibold text-foreground">{viewer.displayName}</p>
              {profile?.username ? (
                <p className="break-all text-meta text-muted">@{profile.username}</p>
              ) : null}
            </div>
          </div>
          <ProfileForm
            displayName={viewer.displayName}
            username={profile?.username ?? null}
            affiliation={profile?.affiliation ?? null}
          />
        </Section>

        <ul className="animate-fade-up flex flex-col gap-0.5" style={stagger(1)}>
          <LinkRow
            href="/me/threads"
            icon={FileText}
            title="My threads"
            description="Everything you posted, with its review status."
          />
          <LinkRow
            href="/account/notifications"
            icon={Bell}
            title="Notification settings"
            description="Choose what you get notified about."
          />
        </ul>

        <Section
          id="account-moderator"
          title="Become a moderator"
          description="Moderators review new threads and keep the community welcoming."
          index={2}
        >
          <Suspense fallback={<Skeleton className="h-16 w-full" />}>
            <ModeratorSection userId={viewer.userId} role={viewer.role} />
          </Suspense>
        </Section>

        <Section
          id="account-data"
          title="Your data"
          description="Get a copy of everything the forum stores about you."
          index={3}
        >
          <p className="text-meta text-muted">
            A JSON file with your profile, threads (including pending and rejected), comments, votes,
            bookmarks, follows, notification settings and your latest 500 notifications, reports and
            update requests you filed, moderator applications and guide progress.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
        </Section>

        <Section
          id="account-danger"
          title="Delete account"
          description="This removes your login and profile for good and cannot be undone."
          index={4}
        >
          <DeleteAccountForm />
        </Section>
      </div>
    </>
  );
}

export default function AccountPage() {
  return (
    <div className="mx-auto w-full max-w-[45rem]">
      <Suspense fallback={null}>
        <ViewerRestrictionBanner className="mb-6" />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <AccountContent />
      </Suspense>
    </div>
  );
}
