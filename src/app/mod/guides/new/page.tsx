import type { Metadata } from "next";

import { GuidesBackLink } from "@/components/guides/back-link";
import { GuideEditor } from "@/components/guides/guide-editor";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "New guide" };

export default function NewGuidePage() {
  return (
    <div className="grid gap-4">
      <GuidesBackLink />
      <Card>
        <h2 className="mb-5 text-base font-semibold tracking-tight">New guide</h2>
        <GuideEditor />
      </Card>
    </div>
  );
}
