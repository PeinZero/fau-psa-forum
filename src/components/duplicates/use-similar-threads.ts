"use client";

import { useEffect, useState } from "react";

import { SEARCH_QUERY_MAX, type SearchResponse } from "@/components/command/types";
import { createClient } from "@/lib/supabase/client";

import type { SimilarThread } from "./types";

export const MIN_QUERY = 8;
const DEBOUNCE_MS = 300;
const MAX_RESULTS = 5;

type Answer = { query: string; results: SimilarThread[]; failed: boolean };

async function lookup(query: string, signal: AbortSignal): Promise<SimilarThread[]> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal });
  if (!response.ok) throw new Error(`search ${response.status}`);
  const { results }: SearchResponse = await response.json();
  const matches = results.slice(0, MAX_RESULTS);
  if (!matches.length) return [];

  // The search payload carries no best-answer flag; a missing flag only hides the indicator.
  const { data } = await createClient()
    .from("threads")
    .select("slug, best_comment_id")
    .in(
      "slug",
      matches.map((match) => match.slug),
    )
    .abortSignal(signal);
  const answered = new Set(data?.filter((row) => row.best_comment_id !== null).map((row) => row.slug));
  return matches.map((match) => ({ ...match, hasBestAnswer: answered.has(match.slug) }));
}

/** Debounced lookup of existing threads for a draft title; stale requests are aborted. */
export function useSimilarThreads(title: string) {
  const [answer, setAnswer] = useState<Answer | null>(null);
  const query = title.trim().slice(0, SEARCH_QUERY_MAX);
  const enabled = query.length >= MIN_QUERY;

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      lookup(query, controller.signal).then(
        (results) => setAnswer({ query, results, failed: false }),
        (error: unknown) => {
          if (controller.signal.aborted) return;
          console.error(error);
          setAnswer({ query, results: [], failed: true });
        },
      );
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, enabled]);

  const current = enabled && answer?.query === query;
  return {
    enabled,
    loading: enabled && !current,
    failed: current && answer.failed,
    // Keep showing the previous matches while the next lookup runs to avoid flicker.
    results: enabled ? (answer?.results ?? []) : [],
  };
}
