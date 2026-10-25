import { Award, Code2, ExternalLink, PenLine, ShieldCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { Suspense } from "react";
import { Avatar, profileHref, profileLinkClasses } from "@/components/author";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, cardClasses } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { stagger } from "@/components/ui/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { affiliationLabels } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { avatarSrc, founders, FOUNDERS_STORY, shapeContributors, type GithubContributor } from "@/lib/team";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contributors",
  description: "The people who build and moderate the PSA FAU Community Forum.",
};

const REPO = "https://github.com/PeinZero/fau-psa-forum";

async function fetchContributors(): Promise<GithubContributor[] | null> {
  "use cache";
  cacheLife("hours");
  try {
    const res = await fetch(
      "https://api.github.com/repos/PeinZero/fau-psa-forum/contributors?per_page=100",
      {
        headers: { Accept: "application/vnd.github+json" },
      },
    );
    if (!res.ok) return null;
    return shapeContributors(await res.json());
  } catch {
    return null;
  }
}

async function CodeContributors() {
  const contributors: GithubContributor[] | null = await fetchContributors();
  if (!contributors?.length) {
    return (
      <EmptyState
        icon={<Code2 />}
        title="Contributors are not available right now"
      >
        See the{" "}
        <a
          href={`${REPO}/graphs/contributors`}
          className="text-accent underline underline-offset-2"
        >
          list on GitHub
        </a>
        .
      </EmptyState>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {contributors.map((c, i) => (
        <li key={c.login} className="animate-fade-up" style={stagger(i)}>
          <a
            href={c.profileUrl}
            className={cardClasses({ variant: "quiet", interactive: true, padding: "none", className: "flex items-center gap-3 p-3" })}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- GitHub avatars are not in next.config remotePatterns */}
            <img
              src={avatarSrc(c.avatarUrl)}
              alt=""
              width={40}
              height={40}
              loading="lazy"
              className="size-10 shrink-0 rounded-full border border-border"
            />
            <span className="min-w-0 truncate text-body font-medium text-foreground">{c.login}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

async function Moderators() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, username, affiliation, role")
    .in("role", ["moderator", "superadmin"])
    .order("display_name");

  if (error)
    return (
      <p className="text-body text-muted">
        The community list could not be loaded.
      </p>
    );
  if (!data.length) {
    return (
      <EmptyState icon={<Users />} title="No moderators yet">
        Be the first: apply from your account page.
      </EmptyState>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((p, i) => (
        <li key={p.id} className="animate-fade-up" style={stagger(i)}>
          <Card variant="quiet" className="flex items-center gap-3 p-3 sm:p-3">
            <Avatar name={p.display_name} size="md" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body font-medium text-foreground">
                {p.username ? (
                  <Link href={profileHref(p.username)} className={profileLinkClasses}>
                    {p.display_name}
                  </Link>
                ) : (
                  p.display_name
                )}
              </span>
              <span className="block truncate text-meta text-muted">
                {p.affiliation ? affiliationLabels[p.affiliation] : " "}
              </span>
            </span>
            <Badge variant={p.role === "superadmin" ? "accent" : "neutral"}>
              {p.role === "superadmin" ? "Superadmin" : "Moderator"}
            </Badge>
          </Card>
        </li>
      ))}
    </ul>
  );
}

async function TopHelpers() {
  // The month window depends on the request time, so this cannot be prerendered.
  await connection();
  const supabase = await createClient();
  const now = new Date();
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const { data, error } = await supabase.rpc("top_helpers", { since });

  if (error) return <p className="text-body text-muted">Top helpers could not be loaded.</p>;
  if (!data.length) {
    return (
      <EmptyState icon={<Award />} title="No helpers ranked yet this month">
        Answer a question and earn points from upvotes and best answers.
      </EmptyState>
    );
  }
  return (
    <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((helper, i) => (
        <li key={helper.user_id} className="animate-fade-up" style={stagger(i)}>
          <Link
            href={`/u/${helper.username}`}
            className={cardClasses({ variant: "quiet", interactive: true, padding: "none", className: "flex items-center gap-3 p-3" })}
          >
            <span aria-hidden className="w-4 text-center text-meta tabular-nums text-subtle">
              {i + 1}
            </span>
            <Avatar name={helper.display_name} size="md" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-body font-medium text-foreground">{helper.display_name}</span>
              <span className="block truncate text-meta text-muted">@{helper.username}</span>
            </span>
            <Badge variant="accent">
              {helper.points} {helper.points === 1 ? "pt" : "pts"}
            </Badge>
          </Link>
        </li>
      ))}
    </ol>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-[66px] rounded-xl" />
      ))}
    </div>
  );
}

const ways = [
  {
    icon: Code2,
    title: "Code",
    body: "Fork the repository, make your change and open a pull request.",
    href: "https://github.com/PeinZero/fau-psa-forum/issues?q=is%3Aopen+label%3A%22good+first+issue%22",
    cta: "Good first issues",
  },
  {
    icon: PenLine,
    title: "Content",
    body: "Write a thread about something you learned the hard way.",
    href: "/new",
    cta: "New thread",
  },
  {
    icon: ShieldCheck,
    title: "Moderation",
    body: "Help review new threads and keep answers current.",
    href: "/account",
    cta: "Apply",
  },
];

export default function ContributorsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl py-4 sm:py-8">
      <header className="hero-glow mb-10 text-center sm:mb-12">
        <h1 className="animate-fade-up text-balance text-display font-semibold text-foreground">
          The people behind the forum
        </h1>
        <p
          className="animate-fade-up mx-auto mt-3 max-w-xl text-body text-balance text-muted"
          style={stagger(1)}
        >
          Moderators who keep answers right, and the people who built it.
        </p>
      </header>

      <section aria-labelledby="moderators-heading" className="mb-12">
        <h2 id="moderators-heading" className="mb-4 text-heading font-semibold">
          Moderators
        </h2>
        <Suspense fallback={<GridSkeleton />}>
          <Moderators />
        </Suspense>
      </section>

      <section aria-labelledby="helpers-heading" className="mb-12">
        <h2 id="helpers-heading" className="mb-4 text-heading font-semibold">
          Top helpers this month
        </h2>
        <Suspense fallback={<GridSkeleton />}>
          <TopHelpers />
        </Suspense>
      </section>

      <section aria-labelledby="founders-heading" className="mb-12">
        <h2 id="founders-heading" className="mb-1 text-heading font-semibold">
          Founders
        </h2>
        <p className="mb-4 text-body text-muted">{FOUNDERS_STORY}</p>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {founders.map((f, i) => (
            <li key={f.name} className="animate-fade-up" style={stagger(i)}>
              <a
                href={f.link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cardClasses({ variant: "quiet", interactive: true, padding: "none", className: "flex items-center gap-4 p-4" })}
              >
                <Avatar name={f.name} size="lg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-title font-semibold text-foreground">{f.name}</span>
                  <span className="block text-meta text-muted">{f.role}</span>
                  <span className="block truncate text-meta text-subtle">{f.link.label}</span>
                </span>
                <ExternalLink aria-hidden className="size-4 shrink-0 text-subtle" strokeWidth={1.75} />
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="code-heading" className="mb-12">
        <h2 id="code-heading" className="mb-1 text-heading font-semibold">
          Open-source contributors
        </h2>
        <p className="mb-4 text-body text-muted">
          Want to help? See{" "}
          <a href={`${REPO}/blob/main/CONTRIBUTING.md`} className="text-accent underline underline-offset-2">
            CONTRIBUTING
          </a>{" "}
          and the{" "}
          <a
            href={`${REPO}/issues?q=is%3Aopen+label%3A%22good+first+issue%22`}
            className="text-accent underline underline-offset-2"
          >
            good first issues
          </a>
          .
        </p>
        <Suspense fallback={<GridSkeleton />}>
          <CodeContributors />
        </Suspense>
      </section>

      <section aria-labelledby="contribute-heading">
        <h2
          id="contribute-heading"
          className="mb-4 text-heading font-semibold"
        >
          How to contribute
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {ways.map(({ icon: Icon, title, body, href, cta }, i) => (
            <Card
              variant="quiet"
              key={title}
              className="animate-fade-up flex flex-col gap-3"
              style={stagger(i)}
            >
              <span
                aria-hidden
                className="flex size-8 items-center justify-center rounded-md bg-raised text-accent"
              >
                <Icon className="size-4" strokeWidth={1.75} />
              </span>
              <h3 className="text-title font-semibold">
                {title}
              </h3>
              <p className="flex-1 text-body text-muted">{body}</p>
              {href.startsWith("/") ? (
                <Link
                  href={href}
                  className={buttonClasses({
                    variant: "secondary",
                    size: "sm",
                    className: "self-start",
                  })}
                >
                  {cta}
                </Link>
              ) : (
                <a
                  href={href}
                  className={buttonClasses({
                    variant: "secondary",
                    size: "sm",
                    className: "self-start",
                  })}
                >
                  {cta}
                  <ExternalLink strokeWidth={1.75} />
                </a>
              )}
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
