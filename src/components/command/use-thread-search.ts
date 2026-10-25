"use client";

import { useEffect, useState } from "react";
import type { SearchResponse, SearchThread } from "./types";

const DEBOUNCE_MS = 150;

type Suggestions = Omit<SearchResponse, "results">;
type Answer = { query: string; results: SearchThread[]; failed: boolean };

export type ThreadSearch = {
  /** Latest results, possibly for an older query while a newer one is in flight. */
  results: SearchThread[] | null;
  suggestions: Suggestions | null;
  loading: boolean;
  failed: boolean;
  retry: () => void;
};

async function fetchSearch(query: string, signal: AbortSignal): Promise<SearchResponse> {
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal });
  if (!response.ok) throw new Error(`search ${response.status}`);
  return response.json();
}

/**
 * Debounced search that drops stale answers. `enabled` gates the requests so the empty-query
 * suggestions load when the palette opens rather than on every page view.
 */
export function useThreadSearch(query: string, enabled: boolean): ThreadSearch {
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [attempt, setAttempt] = useState(0);
  const trimmed = query.trim();

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = setTimeout(
      () => {
        fetchSearch(trimmed, controller.signal).then(
          ({ results, ...rest }) => {
            if (trimmed) setAnswer({ query: trimmed, results, failed: false });
            else setSuggestions(rest);
          },
          (error: unknown) => {
            if (controller.signal.aborted) return;
            console.error(error);
            setAnswer((previous) => ({ query: trimmed, results: previous?.results ?? [], failed: true }));
          },
        );
      },
      trimmed ? DEBOUNCE_MS : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, enabled, attempt]);

  const current = answer?.query === trimmed;
  return {
    results: answer?.results ?? null,
    suggestions,
    loading: enabled && (trimmed ? !current : suggestions === null && !current),
    failed: current && answer.failed,
    retry: () => {
      setAnswer(null);
      setAttempt((value) => value + 1);
    },
  };
}
