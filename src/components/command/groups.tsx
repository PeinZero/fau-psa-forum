import { Info, Megaphone, MessageSquareText, PenLine, Search, ShieldCheck, Users } from "lucide-react";
import type { ReactNode } from "react";

import { CategoryGlyph } from "@/components/thread/category-icon";
import type { SearchCategory, SearchThread } from "./types";

export type Item = {
  key: string;
  href: string;
  label: string;
  /** Second line under the label; threads build theirs from category and city. */
  meta?: string;
  icon: ReactNode;
  thread?: SearchThread;
};

export type Group = { heading: string; items: Item[] };

type Action = Item & { moderatorOnly?: boolean; keywords?: string };

const icon = (Icon: typeof Search) => <Icon aria-hidden strokeWidth={1.75} />;

const askItem: Action = {
  key: "action:ask",
  href: "/new",
  label: "Ask a question",
  icon: icon(PenLine),
  keywords: "new thread post",
};

const actions: Action[] = [
  askItem,
  { key: "action:announcements", href: "/announcements", label: "Announcements", icon: icon(Megaphone), keywords: "news" },
  { key: "action:about", href: "/about", label: "About", icon: icon(Info), keywords: "psa association" },
  { key: "action:contributors", href: "/contributors", label: "Contributors", icon: icon(Users), keywords: "people team" },
  { key: "action:mod", href: "/mod", label: "Moderation", icon: icon(ShieldCheck), moderatorOnly: true, keywords: "review queue" },
];

export function searchHref(query: string, category?: string): string {
  const params = new URLSearchParams({ q: query.trim() });
  if (category) params.set("category", category);
  return `/search?${params}`;
}

function threadItem(thread: SearchThread): Item {
  return { key: `thread:${thread.slug}`, href: `/t/${thread.slug}`, label: thread.title, icon: icon(MessageSquareText), thread };
}

function categoryItem(category: SearchCategory): Item {
  return {
    key: `category:${category.slug}`,
    href: `/c/${category.slug}`,
    label: category.name,
    icon: <CategoryGlyph slug={category.slug} />,
  };
}

function categorySearchItem(category: SearchCategory, query: string): Item {
  return {
    key: `search-in:${category.slug}`,
    href: searchHref(query, category.slug),
    label: `Search in ${category.name}`,
    icon: icon(Search),
  };
}

export type GroupInput = {
  query: string;
  /** Threads matching `query`; ignored for an empty query. */
  threads: SearchThread[];
  recent: SearchThread[];
  categories: SearchCategory[];
  canModerate: boolean;
  /** The search for `query` finished without a single thread. */
  noThreads: boolean;
};

export function buildGroups({ query, threads, recent, categories, canModerate, noThreads }: GroupInput): Group[] {
  const visibleActions = actions.filter((action) => canModerate || !action.moderatorOnly);
  const needle = query.trim().toLowerCase();

  if (!needle) {
    return [
      { heading: "Recent threads", items: recent.map(threadItem) },
      { heading: "Quick actions", items: visibleActions },
      { heading: "Browse categories", items: categories.map(categoryItem) },
      { heading: "Search in a category", items: categories.map((category) => categorySearchItem(category, "")) },
    ].filter((group) => group.items.length > 0);
  }

  const matches = (text: string) => text.toLowerCase().includes(needle);
  const matchingCategories = categories.filter((category) => matches(category.name));
  const searchAll: Item = {
    key: "search:all",
    href: searchHref(query),
    label: `Search all results for “${query.trim()}”`,
    icon: icon(Search),
  };
  const searchItems = [searchAll, ...matchingCategories.map((category) => categorySearchItem(category, query))];

  return [
    { heading: "Threads", items: threads.map(threadItem) },
    {
      heading: "Jump to",
      items: [
        ...matchingCategories.map(categoryItem),
        ...visibleActions.filter((action) => matches(`${action.label} ${action.keywords ?? ""}`)),
      ].filter((item) => !(noThreads && item.key === askItem.key)),
    },
    noThreads
      ? {
          heading: "Next steps",
          items: [{ ...askItem, meta: "Moderators review it, then the community answers" }, ...searchItems],
        }
      : { heading: "Search", items: searchItems },
  ].filter((group) => group.items.length > 0);
}
