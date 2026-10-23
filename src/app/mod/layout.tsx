import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";

import { ModGate } from "@/components/mod/mod-gate";

export const metadata: Metadata = { title: "Moderation", robots: { index: false } };

export default function ModLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-semibold">Moderation</h1>
      <Suspense fallback={<p className="text-muted">Loading...</p>}>
        <ModGate>{children}</ModGate>
      </Suspense>
    </div>
  );
}
