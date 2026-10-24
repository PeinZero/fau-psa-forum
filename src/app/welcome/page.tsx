import { BookOpen, MessageCircleQuestion, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { SignInPrompt } from "@/components/sign-in-prompt";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getViewer } from "@/lib/auth/viewer";
import { safeNextPath } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

import { WelcomeForm } from "./welcome-form";

export const metadata: Metadata = { title: "Welcome", robots: { index: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const HOW_IT_WORKS = [
  { icon: BookOpen, text: "Read freely: every published thread is open to everyone, no account needed." },
  { icon: MessageCircleQuestion, text: "Ask questions and answer others from your own experience." },
  { icon: ShieldCheck, text: "Moderators review new threads before they go public, so the forum stays useful and friendly." },
];

async function WelcomeContent({ searchParams }: Props) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : undefined);
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <Card>
        <SignInPrompt next="/welcome" purpose="to set up your profile." />
      </Card>
    );
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username, affiliation")
    .eq("id", viewer.userId)
    .maybeSingle();

  return (
    <WelcomeForm
      next={next}
      displayName={profile?.display_name ?? viewer.displayName}
      username={profile?.username ?? ""}
      affiliation={profile?.affiliation ?? null}
    />
  );
}

export default function WelcomePage(props: Props) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <WelcomeContent {...props} />
      </Suspense>
      <section aria-labelledby="how-it-works" className="animate-fade-up flex flex-col gap-3 px-1">
        <h2 id="how-it-works" className="text-meta font-medium text-muted">
          How it works
        </h2>
        <ul className="flex flex-col gap-2.5">
          {HOW_IT_WORKS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3 text-sm text-muted">
              <Icon aria-hidden strokeWidth={1.75} className="mt-0.5 size-4 shrink-0 text-accent" />
              {text}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
