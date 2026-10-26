// Reviewing thread edits: moderators mark revisions reviewed or unreviewed, the database records
// who and when, and the moderator queue counts every unreviewed revision regardless of age.
// Moderators are notified once per thread until its edits are reviewed.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { A, ADMIN, B, MOD, anon, as, createThread, createUser, ids, member, setupDatabase, sql, threads } from "./harness.mjs";
import type { Actor } from "./harness.mjs";

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

describe("moderators hear about edits", () => {
  const edit = (actor: Actor, thread: number, title: string) =>
    as(actor, "update public.threads set title = $1 where id = $2", [title, thread]);
  const editNotices = (recipient: string) =>
    sql<{ actor_id: string | null; thread_id: number }>(
      "select actor_id, thread_id from public.notifications where recipient_id = $1 and type = 'mod_thread_edited' order by id",
      [recipient],
    );

  test("the first edit notifies every moderator and superadmin, not the editor", async () => {
    await edit(A, threads.published, "How do I extend my residence permit in Erlangen?");
    for (const recipient of [ids.mod, ids.admin]) {
      assert.deepEqual(await editNotices(recipient), [{ actor_id: ids.a, thread_id: threads.published }]);
    }
    assert.deepEqual(await editNotices(ids.a), []);
    assert.deepEqual(await editNotices(ids.b), []);
  });

  test("a moderator editing their own thread is not told about it", async () => {
    const own = await createThread(ids.mod, "published", "Moderator guide to the Rundfunkbeitrag");
    await edit(MOD, own, "Moderator guide to the Rundfunkbeitrag exemption");
    assert.deepEqual(await editNotices(ids.mod), []);
    assert.deepEqual(await editNotices(ids.admin), [{ actor_id: ids.mod, thread_id: own }]);
  });

  test("further edits while the first is unreviewed send nothing", async () => {
    await edit(A, threads.published, "How do I extend my residence permit in Erlangen?");
    await edit(A, threads.published, "Extending a residence permit in Erlangen");
    await as(A, "update public.threads set body = 'Bring your Anmeldung and a Sperrkonto statement' where id = $1", [threads.published]);
    assert.equal((await editNotices(ids.mod)).length, 1);
    assert.equal((await editNotices(ids.admin)).length, 1);
  });

  test("the next edit after a review notifies again", async () => {
    await edit(A, threads.published, "How do I extend my residence permit in Erlangen?");
    await edit(A, threads.published, "Extending a residence permit in Erlangen");
    await as(MOD, "update public.thread_revisions set reviewed_at = now() where thread_id = $1", [threads.published]);
    await edit(A, threads.published, "Extending a residence permit at the Ausländerbehörde Erlangen");
    assert.equal((await editNotices(ids.mod)).length, 2);
    assert.equal((await editNotices(ids.admin)).length, 2);
  });

  test("a partly reviewed thread still counts as waiting", async () => {
    await edit(A, threads.published, "How do I extend my residence permit in Erlangen?");
    await edit(A, threads.published, "Extending a residence permit in Erlangen");
    const [first] = await sql<{ id: number }>(
      "select id from public.thread_revisions where thread_id = $1 order by id limit 1",
      [threads.published],
    );
    await as(MOD, markReviewed, [first.id]);
    await edit(A, threads.published, "Extending a residence permit at the Ausländerbehörde Erlangen");
    assert.equal((await editNotices(ids.mod)).length, 1);
  });

  test("each thread is announced on its own", async () => {
    await edit(A, threads.published, "How do I extend my residence permit in Erlangen?");
    await edit(B, threads.otherPublished, "Where to buy a used bicycle in Erlangen?");
    assert.deepEqual(
      (await editNotices(ids.mod)).map((n) => n.thread_id),
      [threads.published, threads.otherPublished],
    );
  });

  test("a moderator who muted thread edits gets nothing", async () => {
    await sql("insert into public.notification_preferences (user_id, muted_types) values ($1, '{mod_thread_edited}')", [ids.mod]);
    await edit(A, threads.published, "How do I extend my residence permit in Erlangen?");
    assert.deepEqual(await editNotices(ids.mod), []);
    assert.equal((await editNotices(ids.admin)).length, 1);
  });

  test("members cannot read the moderators' notices", async () => {
    await edit(A, threads.published, "How do I extend my residence permit in Erlangen?");
    assert.deepEqual(await as(A, "select id from public.notifications where type = 'mod_thread_edited'"), []);
  });
});
