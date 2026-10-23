// search_threads_v2: filters, sort orders and typo tolerance. Harness and seed live in harness.mjs.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { A, B, MOD, anon, as, categories, comments, createComment, createThread, ids, setupDatabase, sql, threads } from "./harness.mjs";
import type { Actor } from "./harness.mjs";

setupDatabase();

type Filters = { category?: number | null; city?: string | null; best?: boolean | null; verified?: boolean | null; sort?: string };

const search = async (actor: Actor, q: string, f: Filters = {}) =>
  (
    await as<{ id: number }>(actor, "select id from public.search_threads_v2($1, $2, $3, $4, $5, $6)", [
      q, f.category ?? null, f.city ?? null, f.best ?? null, f.verified ?? null, f.sort ?? "relevance",
    ])
  ).map((r) => r.id);
const sorted = (ids: number[]) => [...ids].sort((x, y) => x - y);
const inCategory = async (thread: number, category: number) =>
  sql("update public.threads set category_id = $1 where id = $2", [category, thread]);
const rpVisa = async () => (await sql<{ id: number }>("select id from public.categories where slug = 'rp-visa'"))[0].id;

describe("search_threads_v2 visibility", () => {
  test("anon and members find published and archived threads by title, body and visible comment", async () => {
    for (const actor of [anon, A, B]) {
      assert.deepEqual(await search(actor, "residence permit"), [threads.published]);
      assert.deepEqual(await search(actor, "Sperrkonto"), [threads.published]);
      assert.deepEqual(await search(actor, "semesterticket"), [threads.archived]);
    }
  });

  test("pending and rejected threads never show up, not even for their author or a moderator", async () => {
    for (const actor of [anon, A, MOD]) {
      assert.deepEqual(await search(actor, "pending question"), []);
      assert.deepEqual(await search(actor, "rejected question"), []);
      const all = await search(actor, "");
      assert.ok(!all.includes(threads.pending) && !all.includes(threads.rejected));
    }
  });

  test("hidden comment text does not find the thread", async () => {
    assert.deepEqual(await search(anon, "cryptocurrency"), []);
    assert.deepEqual(await search(MOD, "cryptocurrency giveaway"), []);
  });

  test("comments of pending threads do not leak the thread", async () => {
    const t = await createThread(ids.a, "published", "Soon pending", "body");
    await createComment(t, ids.b, "pineapple unique comment");
    await sql("update public.threads set status = 'pending' where id = $1", [t]);
    assert.deepEqual(await search(A, "pineapple"), []);
  });
});

describe("search_threads_v2 relevance", () => {
  test("title matches rank before body matches before comment matches", async () => {
    const inComment = await createThread(ids.a, "published", "Unrelated first", "Nothing here");
    await createComment(inComment, ids.b, "zebrafish in a comment");
    const inBody = await createThread(ids.a, "published", "Unrelated second", "A zebrafish in the body");
    const inTitle = await createThread(ids.a, "published", "Zebrafish in the title", "Nothing here either");
    assert.deepEqual(await search(anon, "zebrafish"), [inTitle, inBody, inComment]);
  });
});

describe("search_threads_v2 typo tolerance", () => {
  test("a misspelled word finds the thread; nonsense finds nothing", async () => {
    const id = await createThread(ids.b, "published", "How to do the Anmeldung in Erlangen");
    assert.ok((await search(anon, "anmledung")).includes(id));
    assert.deepEqual(await search(anon, "xylophone"), []);
  });

  test("fuzzy matches join only when full text finds fewer than 5 threads, ranked after the full-text hits", async () => {
    const typo = await createThread(ids.b, "published", "Wohnhiem tips", "Nothing here");
    const exact = [];
    for (let n = 0; n < 3; n++) exact.push(await createThread(ids.a, "published", `Housing ${n}`, "Wohnheim places"));
    const few = await search(anon, "Wohnheim");
    assert.deepEqual(sorted(few.slice(0, 3)), sorted(exact));
    assert.equal(few[3], typo);
    assert.equal(few.length, 4);

    for (let n = 3; n < 5; n++) exact.push(await createThread(ids.a, "published", `Housing ${n}`, "Wohnheim places"));
    const many = await search(anon, "Wohnheim");
    assert.deepEqual(sorted(many), sorted(exact));
  });

  test("the trigram index exists and word_similarity is callable", async () => {
    const [index] = await sql("select indexname from pg_indexes where indexname = 'threads_title_trgm_idx'");
    assert.ok(index);
    const [row] = await sql<{ s: number }>("select extensions.word_similarity('anmledung', 'How to do the Anmeldung') as s");
    assert.ok(row.s > 0.4);
  });
});

describe("search_threads_v2 empty query", () => {
  test("lists every published and archived thread, also for null", async () => {
    const expected = sorted([threads.published, threads.archived, threads.otherPublished]);
    assert.deepEqual(sorted(await search(anon, "")), expected);
    assert.deepEqual(sorted(await search(anon, "   ")), expected);
    const [row] = await as<{ n: number }>(anon, "select count(*)::int as n from public.search_threads_v2(null)");
    assert.equal(row.n, 3);
  });
});

describe("search_threads_v2 filters", () => {
  test("category", async () => {
    const visa = await rpVisa();
    const inVisa = await createThread(ids.a, "published", "Visa thread", "body");
    await inCategory(inVisa, visa);
    assert.deepEqual(await search(anon, "", { category: visa }), [inVisa]);
    assert.deepEqual(
      sorted(await search(anon, "", { category: categories.courses })),
      sorted([threads.published, threads.archived, threads.otherPublished]),
    );
    assert.deepEqual(await search(anon, "Visa", { category: categories.courses }), []);
  });

  test("city: a city also finds threads for both, both finds only both", async () => {
    const erlangen = await createThread(ids.a, "published", "City erlangen", "body", { city: "erlangen" });
    const nuremberg = await createThread(ids.a, "published", "City nuremberg", "body", { city: "nuremberg" });
    const both = await createThread(ids.a, "published", "City both", "body", { city: "both" });
    assert.deepEqual(sorted(await search(anon, "", { city: "erlangen" })), sorted([erlangen, both]));
    assert.deepEqual(sorted(await search(anon, "", { city: "nuremberg" })), sorted([nuremberg, both]));
    assert.deepEqual(await search(anon, "", { city: "both" }), [both]);
    assert.ok(!(await search(anon, "", { city: "erlangen" })).includes(threads.published));
  });

  test("best answer true and false", async () => {
    await sql("update public.threads set best_comment_id = $1 where id = $2", [comments.visible, threads.published]);
    assert.deepEqual(await search(anon, "", { best: true }), [threads.published]);
    assert.deepEqual(sorted(await search(anon, "", { best: false })), sorted([threads.archived, threads.otherPublished]));
  });

  test("verified means confirmed within 6 months; older confirmations count as unverified", async () => {
    await as(MOD, "select public.mark_thread_verified($1)", [threads.published]);
    await as(MOD, "select public.mark_thread_verified($1)", [threads.archived]);
    await sql("update public.threads set last_verified_at = now() - interval '7 months' where id = $1", [threads.archived]);
    assert.deepEqual(await search(anon, "", { verified: true }), [threads.published]);
    assert.deepEqual(sorted(await search(anon, "", { verified: false })), sorted([threads.archived, threads.otherPublished]));
  });

  test("filters combine with each other and with the query", async () => {
    const visa = await rpVisa();
    const match = await createThread(ids.a, "published", "Blue card renewal", "body", { city: "both" });
    const wrongCity = await createThread(ids.a, "published", "Blue card renewal two", "body", { city: "nuremberg" });
    await inCategory(match, visa);
    await inCategory(wrongCity, visa);
    await createThread(ids.a, "published", "Blue card renewal three", "body", { city: "both" });
    for (const id of [match, wrongCity]) await sql("update public.threads set best_comment_id = $1 where id = $2", [await createComment(id, ids.b, "answer"), id]);
    await as(MOD, "select public.mark_thread_verified($1)", [match]);
    const filters = { category: visa, city: "erlangen", best: true, verified: true };
    assert.deepEqual(await search(anon, "blue card", filters), [match]);
    assert.deepEqual(await search(anon, "", filters), [match]);
    assert.deepEqual(await search(anon, "blue card", { ...filters, verified: false }), []);
  });
});

describe("search_threads_v2 sort", () => {
  test("newest orders by created_at descending", async () => {
    await sql("update public.threads set created_at = now() - interval '3 days' where id = $1", [threads.published]);
    await sql("update public.threads set created_at = now() - interval '1 day' where id = $1", [threads.archived]);
    await sql("update public.threads set created_at = now() - interval '2 days' where id = $1", [threads.otherPublished]);
    assert.deepEqual(await search(anon, "", { sort: "newest" }), [threads.archived, threads.otherPublished, threads.published]);
  });

  test("top orders by visible comment count; hidden comments do not count", async () => {
    // published has 1 visible + 1 hidden comment; otherPublished gets a second visible one
    await createComment(threads.otherPublished, ids.b, "another answer");
    const busy = await createThread(ids.a, "published", "Busy thread", "body");
    for (const text of ["one", "two", "three"]) await createComment(busy, ids.b, text);
    const ranked = await search(anon, "", { sort: "top" });
    assert.deepEqual(ranked.slice(0, 3), [busy, threads.otherPublished, threads.published]);
    assert.equal(ranked[3], threads.archived);
  });

  test("relevance is the default", async () => {
    const [a, b] = [await search(anon, "residence permit"), await search(anon, "residence permit", { sort: "relevance" })];
    assert.deepEqual(a, b);
  });
});

describe("search_threads_v2 query length", () => {
  test("accepts 100 characters and rejects longer queries", async () => {
    assert.deepEqual(await search(anon, "x".repeat(100)), []);
    await assert.rejects(search(anon, "x".repeat(101)), /search is limited to 100 characters/);
    await assert.rejects(search(A, "residence permit ".repeat(10)), /search is limited to 100 characters/);
  });
});

describe("search_threads (v1)", () => {
  test("keeps working unchanged", async () => {
    const rows = await as<{ id: number }>(anon, "select id from public.search_threads($1)", ["residence permit"]);
    assert.deepEqual(rows.map((r) => r.id), [threads.published]);
  });
});
