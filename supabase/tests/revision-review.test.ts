// Reviewing thread edits: moderators mark revisions reviewed or unreviewed, the database records
// who and when, and the moderator queue counts every unreviewed revision regardless of age.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { A, ADMIN, MOD, anon, as, createUser, ids, member, setupDatabase, sql, threads } from "./harness.mjs";

setupDatabase();

type Review = { reviewed_at: Date | null; reviewed_by: string | null };

async function addRevision(thread: number, ageDays = 0): Promise<number> {
  const [row] = await sql<{ id: number }>(
    `insert into public.thread_revisions (thread_id, title, body, edited_by, created_at)
     values ($1, 'Old title', 'Old body', $2, now() - make_interval(days => $3)) returning id`,
    [thread, ids.a, ageDays],
  );
  return row.id;
}

const review = async (revision: number) =>
  (await sql<Review>("select reviewed_at, reviewed_by from public.thread_revisions where id = $1", [revision]))[0];

const markReviewed = "update public.thread_revisions set reviewed_at = now() where id = $1 returning id";

describe("marking revisions reviewed", () => {
  test("an author's edit of a public thread waits for review", async () => {
    await as(A, "update public.threads set title = 'How do I extend my residence permit in Erlangen?' where id = $1", [threads.published]);
    const rows = await sql<Review>("select reviewed_at, reviewed_by from public.thread_revisions where thread_id = $1", [threads.published]);
    assert.deepEqual(rows, [{ reviewed_at: null, reviewed_by: null }]);
  });

  for (const [name, actor, id] of [["moderator", () => MOD, () => ids.mod], ["superadmin", () => ADMIN, () => ids.admin]] as const) {
    test(`${name} marks a revision reviewed and is recorded as reviewer`, async () => {
      const revision = await addRevision(threads.published);
      assert.equal((await as(actor(), markReviewed, [revision])).length, 1);
      const row = await review(revision);
      assert.ok(row.reviewed_at);
      assert.equal(row.reviewed_by, id());
    });
  }

  test("a backdated review time is replaced by the real one", async () => {
    const revision = await addRevision(threads.published);
    await as(MOD, "update public.thread_revisions set reviewed_at = '2020-01-01' where id = $1", [revision]);
    const [row] = await sql<{ recent: boolean }>(
      "select reviewed_at > now() - interval '1 minute' as recent from public.thread_revisions where id = $1",
      [revision],
    );
    assert.equal(row.recent, true);
  });

  test("un-reviewing clears both the time and the reviewer", async () => {
    const revision = await addRevision(threads.published);
    await as(MOD, markReviewed, [revision]);
    await as(ADMIN, "update public.thread_revisions set reviewed_at = null where id = $1", [revision]);
    assert.deepEqual(await review(revision), { reviewed_at: null, reviewed_by: null });
  });

  test("members cannot mark revisions reviewed", async () => {
    const revision = await addRevision(threads.published);
    assert.equal((await as(A, markReviewed, [revision])).length, 0);
    assert.deepEqual(await review(revision), { reviewed_at: null, reviewed_by: null });
  });

  test("anon cannot mark revisions reviewed", async () => {
    const revision = await addRevision(threads.published);
    await assert.rejects(as(anon, markReviewed, [revision]), /permission denied/);
    assert.deepEqual(await review(revision), { reviewed_at: null, reviewed_by: null });
  });

  test("moderators cannot set the reviewer or rewrite history directly", async () => {
    const revision = await addRevision(threads.published);
    await assert.rejects(
      as(MOD, "update public.thread_revisions set reviewed_by = $1 where id = $2", [ids.a, revision]),
      /permission denied/,
    );
    await assert.rejects(as(MOD, "update public.thread_revisions set body = 'rewritten' where id = $1", [revision]), /permission denied/);
  });

  test("deleting the reviewer keeps the review without a reviewer", async () => {
    const leaver = await createUser("leaving-mod@example.com", { full_name: "Leaving Mod" });
    await sql("update public.profiles set role = 'moderator' where id = $1", [leaver]);
    const revision = await addRevision(threads.published);
    await as(member(leaver), markReviewed, [revision]);
    await sql("delete from auth.users where id = $1", [leaver]);
    const row = await review(revision);
    assert.ok(row.reviewed_at);
    assert.equal(row.reviewed_by, null);
  });
});

describe("moderator edits count", () => {
  // Mirrors the `edits` count in src/components/mod/counts.ts.
  const unreviewed = async () =>
    Number((await as<{ n: number }>(MOD, "select count(*) as n from public.thread_revisions where reviewed_at is null"))[0].n);

  test("counts every unreviewed revision regardless of age, and no reviewed ones", async () => {
    const before = await unreviewed();
    await addRevision(threads.published, 30);
    const fresh = await addRevision(threads.otherPublished);
    await addRevision(threads.archived, 400);
    assert.equal(await unreviewed(), before + 3);

    await as(MOD, markReviewed, [fresh]);
    assert.equal(await unreviewed(), before + 2);
  });

  test("members see no revisions to count", async () => {
    await addRevision(threads.published);
    assert.equal((await as(A, "select id from public.thread_revisions")).length, 0);
  });
});
