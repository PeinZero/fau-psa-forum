import { ArrowRight, ListChecks, Pencil, Plus, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { moderateGuide } from "@/components/guides/actions";
import { guideHref } from "@/components/guides/guide-card";
import { ActionButton } from "@/components/mod/action-button";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { stagger } from "@/components/ui/motion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Guides" };

export default async function ModGuidesPage() {
  const supabase = await createClient();
  const { data: guides, error } = await supabase
    .from("guides")
    .select("id, slug, title, is_featured, sort_order, guide_steps(count)")
    .order("is_featured", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-tight">Guides</h2>
        <Link href="/mod/guides/new" className={buttonClasses({ variant: "primary", size: "sm" })}>
          <Plus aria-hidden strokeWidth={1.75} />
          New guide
        </Link>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          Could not load guides. Please reload.
        </p>
      ) : guides.length === 0 ? (
        <EmptyState icon={<ListChecks />} title="No guides yet">
          Create the first step-by-step guide for newcomers.
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {guides.map((guide, index) => {
            const steps = guide.guide_steps[0]?.count ?? 0;
            return (
              <li key={guide.id} style={stagger(index)} className="animate-fade-up">
                <Card className="grid gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Link
                      href={`/mod/guides/${guide.id}`}
                      className="min-w-0 truncate text-sm font-medium text-foreground underline-offset-2 hover:underline"
                    >
                      {guide.title}
                    </Link>
                    {guide.is_featured && (
                      <Badge variant="accent">
                        <Star aria-hidden strokeWidth={1.75} />
                        Featured
                      </Badge>
                    )}
                  </div>
                  <p className="-mt-2 text-meta text-muted">
                    {steps} {steps === 1 ? "step" : "steps"} · order {guide.sort_order} ·{" "}
                    <span className="font-mono">/guides/{guide.slug}</span>
                  </p>
                  <div className="flex flex-wrap items-start gap-2">
                    <Link href={`/mod/guides/${guide.id}`} className={buttonClasses({ variant: "secondary", size: "sm" })}>
                      <Pencil aria-hidden strokeWidth={1.75} />
                      Edit
                    </Link>
                    <ActionButton
                      action={moderateGuide}
                      fields={{ guideId: guide.id, op: guide.is_featured ? "unfeature" : "feature" }}
                      label={guide.is_featured ? "Unfeature" : "Feature"}
                      pendingLabel="Saving..."
                    />
                    <Link href={guideHref(guide.slug)} className={buttonClasses({ variant: "ghost", size: "sm" })}>
                      View
                      <ArrowRight aria-hidden strokeWidth={1.75} />
                    </Link>
                    <div className="sm:ml-auto">
                      <ActionButton
                        action={moderateGuide}
                        fields={{ guideId: guide.id, op: "delete" }}
                        label="Delete"
                        pendingLabel="Deleting..."
                        tone="danger"
                        confirm={`Delete "${guide.title}"? Its steps and everyone's progress are removed. This cannot be undone.`}
                      />
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
