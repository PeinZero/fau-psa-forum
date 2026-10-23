import type { Enums } from "@/lib/supabase/database.types";

export const SEARCH_QUERY_MAX = 100;

export type SearchThread = {
  slug: string;
  title: string;
  category: { slug: string; name: string } | null;
  city: Enums<"city"> | null;
  commentCount: number;
};

export type SearchCategory = { slug: string; name: string };

/** An empty query answers with suggestions for the palette's start screen instead of results. */
export type SearchResponse = {
  results: SearchThread[];
  recent?: SearchThread[];
  categories?: SearchCategory[];
};
