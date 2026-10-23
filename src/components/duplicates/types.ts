import type { SearchThread } from "@/components/command/types";

export type SimilarThread = SearchThread & { hasBestAnswer: boolean };
