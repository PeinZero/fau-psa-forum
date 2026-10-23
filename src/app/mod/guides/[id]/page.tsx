import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { moderateGuide } from "@/components/guides/actions";
import { GuidesBackLink } from "@/components/guides/back-link";
import { getGuideForEdit } from "@/components/guides/data";
import { guideHref } from "@/components/guides/guide-card";
import { GuideEditor } from "@/components/guides/guide-editor";
import { ActionButton } from "@/components/mod/action-button";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Edit guide" };

export default async function EditGuidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guideId = Number(id);
  if (!Number.isSafeInteger(guideId) || guideId <= 0) notFound();
  const guide = await getGuideForEdit(guideId);
  if (!guide) notFound();

  return (
    <div className="grid gap-4">
      <GuidesBackLink />
      <Card>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold tracking-tight">Edit guide</h2>
          <Link href={guideHref(guide.slug)} className={buttonClasses({ variant: "ghost", size: "sm" })}>
            View guide
            <ArrowRight aria-hidden strokeWidth={1.75} />
          </Link>
        </div>
        <GuideEditor guide={guide} />
      </Card>
      <Card className="grid gap-3">
        <h2 className="text-sm font-semibold tracking-tight">Delete guide</h2>
        <p className="text-meta text-muted">Removes the guide, its steps and every member&apos;s progress on it.</p>
        <div>
          <ActionButton
            action={moderateGuide}
            fields={{ guideId: guide.id, op: "delete" }}
            label="Delete guide"
            pendingLabel="Deleting..."
            tone="danger"
            confirm={`Delete "${guide.title}"? This cannot be undone.`}
          />
        </div>
      </Card>
    </div>
  );
}
