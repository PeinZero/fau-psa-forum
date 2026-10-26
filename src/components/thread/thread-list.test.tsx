import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({ rows: [] as unknown[] }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({ in: async () => ({ data: supabase.rows }) }),
    }),
  }),
}));

import { fetchThreadsByIds, ThreadList, type ThreadListRow, ThreadRow, ThreadRows } from "./thread-list";

const NOW = new Date("2026-10-25T12:00:00Z").getTime();

function thread(overrides: Partial<ThreadListRow> = {}): ThreadListRow {
  return {
    id: 1,
    slug: "anmeldung-in-erlangen-ab12cd",
    title: "How do I register my address (Anmeldung) in Erlangen?",
    excerpt: "Everyone who moves into a flat has to register the address with the city.",
    city: "erlangen",
    is_outdated: false,
    is_pinned: false,
    status: "published",
    created_at: new Date(NOW - 2 * 3600_000).toISOString(),
    last_activity_at: new Date(NOW - 3600_000).toISOString(),
    last_verified_at: null,
    score: 3,
    comment_count: 2,
    best_comment_id: null,
    category: { slug: "first-steps", name: "First Steps" },
    author: { display_name: "Ayesha Khan", username: "ayesha_khan", affiliation: "student", role: "member" },
    ...overrides,
  };
}

function renderRow(overrides: Partial<ThreadListRow> = {}, props: { hideCategory?: boolean; hideAuthor?: boolean } = {}) {
  render(<ThreadList now={NOW} threads={[thread(overrides)]} emptyText="No threads yet" {...props} />);
  return screen.getByRole("listitem");
}

describe("ThreadList rows", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });

  it("links the title to the thread and the category to its page", () => {
    const row = renderRow();
    expect(within(row).getByRole("link", { name: /Anmeldung/ })).toHaveAttribute("href", "/t/anmeldung-in-erlangen-ab12cd");
    expect(within(row).getByRole("link", { name: "First Steps" })).toHaveAttribute("href", "/c/first-steps");
  });

  it("shows category, city, author and relative time as plain meta, not pills", () => {
    const row = renderRow();
    expect(row).toHaveTextContent("Erlangen");
    expect(row).toHaveTextContent("Ayesha Khan");
    const time = within(row).getByText("2 hr. ago");
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("title", "25 Oct 2026");
  });

  it("hides the category on its own category page", () => {
    const row = renderRow({}, { hideCategory: true });
    expect(within(row).queryByRole("link", { name: "First Steps" })).toBeNull();
  });

  it("hides the author on their own profile but keeps the time", () => {
    const row = renderRow({}, { hideAuthor: true });
    expect(row).not.toHaveTextContent("Ayesha Khan");
    expect(within(row).getByText("2 hr. ago")).toBeInTheDocument();
  });

  it("shows the excerpt below the title", () => {
    expect(renderRow()).toHaveTextContent("Everyone who moves into a flat");
  });

  it("leaves out an empty excerpt", () => {
    const row = renderRow({ excerpt: "" });
    expect(row.querySelectorAll("p")).toHaveLength(1);
  });

  it.each([
    [1, "1 comment"],
    [12, "12 comments"],
  ])("shows %i comments compactly with a spoken label", (count, label) => {
    const row = renderRow({ comment_count: count });
    expect(row).toHaveTextContent(label);
    expect(within(row).getByTitle(label)).toHaveTextContent(String(count));
  });

  it("leaves the comment count out while there are none", () => {
    expect(renderRow({ comment_count: 0 })).not.toHaveTextContent(/comment/);
  });

  it("announces the score for screen readers", () => {
    const row = renderRow({ score: 7 });
    expect(within(row).getAllByText("Score")[0].parentElement).toHaveTextContent("Score 7");
    expect(row).toHaveTextContent("7 points");
  });

  it("keeps a zero score out of sight but still announces it", () => {
    const row = renderRow({ score: 0 });
    const score = within(row).getByText("Score").parentElement!;
    expect(score).toHaveTextContent("Score 0");
    expect(score).toHaveClass("sr-only");
    expect(row).not.toHaveTextContent("points");
  });

  it("links the author to their public profile, above the row link", () => {
    const link = within(renderRow()).getByRole("link", { name: "Ayesha Khan" });
    expect(link).toHaveAttribute("href", "/u/ayesha_khan");
    expect(link).toHaveClass("relative", "z-10");
  });

  it("shows no status pills for an ordinary thread", () => {
    const row = renderRow();
    for (const label of ["Answered", "Pinned", "Outdated", "Verified"]) expect(row).not.toHaveTextContent(label);
  });

  it("shows Answered, Pinned, Outdated and Verified when they apply", () => {
    const row = renderRow({
      best_comment_id: 9,
      is_pinned: true,
      is_outdated: true,
      last_verified_at: "2026-09-01T10:00:00Z",
    });
    for (const label of ["Answered", "Pinned", "Outdated", "Verified"]) expect(row).toHaveTextContent(label);
  });

  it("names a deleted author without a link", () => {
    const row = renderRow({ author: null });
    expect(row).toHaveTextContent("Deleted user");
    expect(within(row).queryByRole("link", { name: "Deleted user" })).toBeNull();
  });

  it("keeps the given order", () => {
    render(
      <ThreadList now={NOW}
        threads={[thread({ id: 2, title: "Second" }), thread({ id: 1, title: "First" })]}
        emptyText="No threads yet"
      />,
    );
    expect(screen.getAllByRole("heading").map((h) => h.textContent)).toEqual(["Second", "First"]);
  });

  it("shows a warm empty state with a way to ask", () => {
    render(<ThreadList now={NOW} threads={[]} emptyText="No threads yet" />);
    expect(screen.getByText("No threads yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ask a question" })).toHaveAttribute("href", "/new");
  });
});

describe("ThreadRow for other lists", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });

  it("marks the search words in the title and in a replacement excerpt", () => {
    const { container } = render(
      <ThreadRows>
        <ThreadRow now={NOW}
          thread={{ ...thread(), excerpt: undefined }}
          highlight="anmeldung"
          excerpt="Book an Anmeldung appointment early."
        />
      </ThreadRows>,
    );
    const marks = [...container.querySelectorAll("mark")].map((mark) => mark.textContent);
    expect(marks).toEqual(["Anmeldung", "Anmeldung"]);
    expect(screen.getByRole("listitem")).toHaveTextContent("Book an Anmeldung appointment early.");
  });

  it("leaves an author unlinked when the list did not load handles", () => {
    render(
      <ThreadRows>
        <ThreadRow now={NOW} thread={{ ...thread(), author: { display_name: "Ayesha Khan" } }} />
      </ThreadRows>,
    );
    expect(screen.getByRole("listitem")).toHaveTextContent("Ayesha Khan");
    expect(screen.queryByRole("link", { name: "Ayesha Khan" })).toBeNull();
  });

  it("drops the score column when the list has no scores", () => {
    render(
      <ThreadRows>
        <ThreadRow now={NOW} thread={{ ...thread(), score: undefined }} />
      </ThreadRows>,
    );
    expect(screen.queryByText("Score")).toBeNull();
  });
});

describe("fetchThreadsByIds", () => {
  it("returns rows in the requested order with a plain-text excerpt instead of the body", async () => {
    supabase.rows = [
      { id: 1, title: "One", body: "**Bold** start of [the post](https://example.com)." },
      { id: 2, title: "Two", body: "# Heading\n\nSecond body" },
    ];
    const rows = await fetchThreadsByIds([2, 1]);
    expect(rows.map((row) => row.id)).toEqual([2, 1]);
    expect(rows[0]).toMatchObject({ excerpt: "Heading Second body" });
    expect(rows[1]).toMatchObject({ excerpt: "Bold start of the post." });
    expect(rows[0]).not.toHaveProperty("body");
  });

  it("trims long bodies to a short teaser", async () => {
    supabase.rows = [{ id: 1, title: "Long", body: "word ".repeat(200) }];
    const [row] = await fetchThreadsByIds([1]);
    expect(row.excerpt.length).toBeLessThanOrEqual(221);
    expect(row.excerpt.endsWith("…")).toBe(true);
  });

  it("skips ids the visitor may not see and does not query for none", async () => {
    supabase.rows = [{ id: 1, title: "Visible", body: "" }];
    expect((await fetchThreadsByIds([3, 1])).map((row) => row.id)).toEqual([1]);
    expect(await fetchThreadsByIds([])).toEqual([]);
  });
});
