import { Award, Code2, ExternalLink, PenLine, ShieldCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { Suspense } from "react";
import { Avatar } from "@/components/author";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, cardClasses } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { stagger } from "@/components/ui/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { affiliationLabels } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contributors",
  description: "The people who build and moderate the FAU PSA Forum.",
};

const REPO = "https://github.com/PeinZero/fau-psa-forum";

type GithubContributor = {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
};

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
    const data = (await res.json()) as (GithubContributor & { type: string })[];
    return data
      .filter((c) => c.type !== "Bot")
      .map(({ login, avatar_url, html_url, contributions }) => ({
        login,
        avatar_url,
        html_url,
        contributions,
      }));
  } catch {
    return null;
  }
}

async function CodeContributors() {
  const contributors = await fetchContributors();
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
            href={c.html_url}
            className={cardClasses({ interactive: true, padding: "none", className: "flex items-center gap-3 p-3" })}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- GitHub avatars are not in next.config remotePatterns */}
            <img
              src={`${c.avatar_url}${c.avatar_url.includes("?") ? "&" : "?"}s=80`}
              alt=""
              width={40}
              height={40}
              loading="lazy"
              className="size-10 rounded-full border border-border"
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">
                {c.login}
              </span>
              <span className="block text-meta text-muted">
                {c.contributions}{" "}
                {c.contributions === 1 ? "contribution" : "contributions"}
              </span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

async function Community() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, affiliation, role")
    .in("role", ["moderator", "superadmin"])
    .order("display_name");

  if (error)
    return (
      <p className="text-sm text-muted">
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
          <Card className="flex items-center gap-3 p-3 sm:p-3">
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent-soft text-sm font-semibold text-accent"
            >
              {p.display_name.trim().slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {p.display_name}
              </span>
              <span className="block text-meta text-muted">
                {p.affiliation ? affiliationLabels[p.affiliation] : " "}
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
  const supabase = await createClient();
  const now = new Date();
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const { data, error } = await supabase.rpc("top_helpers", { since });

  if (error) return <p className="text-sm text-muted">Top helpers could not be loaded.</p>;
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
            className={cardClasses({ interactive: true, padding: "none", className: "flex items-center gap-3 p-3" })}
          >
            <span aria-hidden className="w-4 text-center text-meta tabular-nums text-subtle">
              {i + 1}
            </span>
            <Avatar name={helper.display_name} size="md" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{helper.display_name}</span>
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
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="hero-glow mb-12 text-center">
        <h1 className="animate-fade-up text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Built by the community
        </h1>
        <p
          className="animate-fade-up mx-auto mt-3 max-w-xl text-balance text-muted"
          style={stagger(1)}
        >
          The people who write the code and keep the answers right.
        </p>
      </header>

      <section aria-labelledby="code-heading" className="mb-12">
        <h2
          id="code-heading"
          className="mb-4 text-lg font-semibold tracking-tight"
        >
          Code
        </h2>
        <Suspense fallback={<GridSkeleton />}>
          <CodeContributors />
        </Suspense>
      </section>

      <section aria-labelledby="helpers-heading" className="mb-12">
        <h2 id="helpers-heading" className="mb-4 text-lg font-semibold tracking-tight">
          Top helpers this month
        </h2>
        <Suspense fallback={<GridSkeleton />}>
          <TopHelpers />
        </Suspense>
      </section>

      <section aria-labelledby="community-heading" className="mb-12">
        <h2
          id="community-heading"
          className="mb-4 text-lg font-semibold tracking-tight"
        >
          Community
        </h2>
        <Suspense fallback={<GridSkeleton />}>
          <Community />
        </Suspense>
      </section>

      <section aria-labelledby="contribute-heading">
        <h2
          id="contribute-heading"
          className="mb-4 text-lg font-semibold tracking-tight"
        >
          How to contribute
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {ways.map(({ icon: Icon, title, body, href, cta }, i) => (
            <Card
              key={title}
              className="animate-fade-up flex flex-col gap-3"
              style={stagger(i)}
            >
              <span
                aria-hidden
                className="flex size-8 items-center justify-center rounded-md border border-border bg-background text-accent"
              >
                <Icon className="size-4" strokeWidth={1.75} />
              </span>
              <h3 className="text-base font-semibold tracking-tight">
                {title}
              </h3>
              <p className="flex-1 text-sm text-muted">{body}</p>
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
