"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";

import { SegmentedControl } from "@/components/ui/segmented-control";

import type { CommentSort } from "./thread-data";

const OPTIONS = [
  { value: "top", label: "Top" },
  { value: "new", label: "Newest" },
] as const;

/** Top is the default and keeps a clean URL; Newest is shareable as `?sort=new`. */
export function CommentSortControl({ slug, value }: { slug: string; value: CommentSort }) {
  const router = useRouter();
  const [shown, setShown] = useOptimistic(value);
  const [, startTransition] = useTransition();

  return (
    <SegmentedControl
      label="Sort comments"
      value={shown}
      options={OPTIONS}
      onChange={(next) =>
        startTransition(() => {
          setShown(next);
          router.replace(next === "new" ? `/t/${slug}?sort=new` : `/t/${slug}`, { scroll: false });
        })
      }
    />
  );
}
