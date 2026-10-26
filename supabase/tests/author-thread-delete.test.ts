// Authors take back threads that were never public (pending or rejected); published and archived
// threads stay because others rely on them. Rejected threads nobody fixes are purged 7 days after
// the rejection or the author's last edit, whichever is later.
import { randomUUID } from "node:crypto";
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { A, ADMIN, B, MOD, anon, as, createThread, ids, setupDatabase, sql, threads } from "./harness.mjs";
import type { Actor } from "./harness.mjs";

setupDatabase();

type DbError = { message: string; code: string };

const deleteOwn = async (actor: Actor, thread: number) =>
  (await as<{ keys: string[] }>(actor, "select public.delete_own_thread($1) as keys", [thread]))[0].keys;

const purge = async () => (await sql<{ purged: number }>("select public.purge_rejected_threads() as purged"))[0].purged;

async function errorOf(run: () => Promise<unknown>): Promise<DbError> {
  try {
    await run();
  } catch (error) {
    const { message, code } = error as Error & { code?: string };
    return { message, code: code ?? "" };
  }
  assert.fail("expected the database to raise");
}

async function seedImage(thread: number, owner: string): Promise<string> {
  const key = `threads/${randomUUID()}.webp`;
  await sql(
    `insert into public.thread_images (thread_id, owner_id, storage_key, content_type, width, height, size_bytes)
     values ($1, $2, $3, 'image/webp', 1200, 900, 150000)`,
    [thread, owner, key],
  );
  return key;
}

const queuedKeys = async () =>
  (await sql<{ storage_key: string }>("select storage_key from public.media_deletions order by storage_key")).map((row) => row.storage_key);

const threadExists = async (thread: number) => (await sql("select 1 from public.threads where id = $1", [thread])).length === 1;

const editedAt = async (thread: number) =>
  (await sql<{ edited_at: Date | null }>("select edited_at from public.threads where id = $1", [thread]))[0].edited_at;

/** Moves a thread's clock back: ages are Postgres intervals such as '8 days', null leaves the column null. */
async function age(thread: number, ages: { created: string; reviewed: string | null; edited: string | null }) {
  await sql(
    `update public.threads set
       created_at = now() - $2::interval,
       reviewed_at = now() - $3::interval,
       edited_at = now() - $4::interval
     where id = $1`,
    [thread, ages.created, ages.reviewed, ages.edited],
  );
}

describe("authors deleting their own threads", () => {
  test("an author deletes their pending thread and gets its image keys in gallery order", async () => {
    const first = await seedImage(threads.pending, ids.a);
    const second = await seedImage(threads.pending, ids.a);
    assert.deepEqual(await deleteOwn(A, threads.pending), [first, second]);
    assert.equal(await threadExists(threads.pending), false);
    assert.deepEqual(await queuedKeys(), [first, second].sort());
  });

  test("an author deletes their rejected thread; no log entry and no notification", async () => {
    await as(MOD, "update public.threads set status = 'published' where id = $1", [threads.rejected]);
    const thread = await createThread(ids.a, "pending", "Which bank accepts a blocked account transfer?");
    await as(MOD, "update public.threads set status = 'rejected', rejection_reason = 'Duplicate' where id = $1", [thread]);
    assert.equal((await sql("select 1 from public.notifications where thread_id = $1 and type = 'thread_rejected'", [thread])).length, 1);
    const logBefore = await sql("select id from public.moderation_log");
    const key = await seedImage(thread, ids.a);

    assert.deepEqual(await deleteOwn(A, thread), [key]);
    assert.equal(await threadExists(thread), false);
    assert.deepEqual(await queuedKeys(), [key]);
    assert.deepEqual(await sql("select id from public.moderation_log"), logBefore);
    assert.deepEqual(await sql("select id from public.notifications where type = 'thread_deleted'"), []);
    // The rejection notice was about the thread and goes with it.
    assert.deepEqual(await sql("select id from public.notifications where thread_id = $1", [thread]), []);
  });

  test("a thread without images returns no keys", async () => {
    assert.deepEqual(await deleteOwn(A, threads.pending), []);
  });

  test("what only existed for the thread goes with it; guide steps keep their text", async () => {
    await as(A, "insert into public.bookmarks (thread_id) values ($1)", [threads.rejected]);
    await as(A, "insert into public.thread_follows (thread_id) values ($1) on conflict do nothing", [threads.rejected]);
    const [{ id: guide }] = await sql<{ id: number }>("insert into public.guides (slug, title) values ('arriving-in-erlangen', 'Arriving in Erlangen') returning id");
    await sql(
      "insert into public.guide_steps (guide_id, position, title, body, thread_id) values ($1, 0, 'Open a bank account', 'Bring your passport', $2)",
      [guide, threads.rejected],
    );
    const reputationBefore = await sql("select id, reputation, best_answer_count from public.profiles order by id");

    await deleteOwn(A, threads.rejected);

    for (const table of ["bookmarks", "thread_follows", "thread_revisions", "notifications"]) {
      assert.deepEqual(await sql(`select 1 from public.${table} where thread_id = $1`, [threads.rejected]), [], table);
    }
    assert.deepEqual(await sql("select id, reputation, best_answer_count from public.profiles order by id"), reputationBefore);
    const steps = await sql("select title, thread_id from public.guide_steps where guide_id = $1", [guide]);
    assert.deepEqual(steps, [{ title: "Open a bank account", thread_id: null }]);
  });

  test("published and archived threads stay, for their author too", async () => {
    const archived = await createThread(ids.a, "archived", "Semester ticket prices last year");
    for (const thread of [threads.published, archived]) {
      assert.deepEqual(await errorOf(() => deleteOwn(A, thread)), {
        message: "only pending or rejected threads can be deleted by their author",
        code: "42501",
      });
      assert.equal(await threadExists(thread), true);
    }
  });

  test("nobody deletes someone else's thread this way, and unreadable threads are not found", async () => {
    for (const thread of [threads.pending, threads.rejected, 999_999]) {
      assert.deepEqual(await errorOf(() => deleteOwn(B, thread)), { message: "thread not found", code: "P0002" });
    }
    assert.deepEqual(await errorOf(() => deleteOwn(B, threads.published)), {
      message: "only the author can delete this thread",
      code: "42501",
    });
    for (const actor of [MOD, ADMIN]) {
      assert.deepEqual(await errorOf(() => deleteOwn(actor, threads.pending)), {
        message: "only the author can delete this thread",
        code: "42501",
      });
    }
    for (const thread of [threads.pending, threads.rejected, threads.published]) assert.equal(await threadExists(thread), true);
  });

  test("anon cannot call it", async () => {
    assert.match((await errorOf(() => deleteOwn(anon, threads.pending))).message, /permission denied for function delete_own_thread/);
    assert.equal(await threadExists(threads.pending), true);
  });

  test("a banned author cannot delete; a muted author can", async () => {
    await as(ADMIN, "select public.restrict_user($1, 'ban', 'Posted a classmate''s phone number')", [ids.a]);
    assert.deepEqual(await errorOf(() => deleteOwn(A, threads.pending)), {
      message: "your account is banned: Posted a classmate's phone number",
      code: "P0001",
    });
    assert.equal(await threadExists(threads.pending), true);

    await as(MOD, "select public.restrict_user($1, 'mute', 'Too many duplicate questions')", [ids.b]);
    const thread = await createThread(ids.b, "rejected", "Where can I print my thesis in Nuremberg?");
    assert.deepEqual(await deleteOwn(B, thread), []);
    assert.equal(await threadExists(thread), false);
  });

  test("clients still have no direct delete on threads", async () => {
    assert.match(
      (await errorOf(() => as(A, "delete from public.threads where id = $1", [threads.pending]))).message,
      /permission denied for table threads/,
    );
  });
});

describe("the author's edits of a rejected thread restart its clock", () => {
  test("changing the title, text, category or city stamps edited_at", async () => {
    const [{ id: other }] = await sql<{ id: number }>("select id from public.categories where slug = 'accommodation'");
    const changes: [string, unknown][] = [
      ["title = $2", "Rejected question from Ayesha, now with details"],
      ["body = $2", "Added the semester and my programme"],
      ["category_id = $2", other],
      ["city = $2", "erlangen"],
    ];
    for (const [set, value] of changes) {
      await sql("update public.threads set edited_at = null where id = $1", [threads.rejected]);
      await as(A, `update public.threads set ${set} where id = $1`, [threads.rejected, value]);
      assert.ok(await editedAt(threads.rejected), set);
    }
  });

  test("adding or removing an image stamps edited_at", async () => {
    const key = `threads/${randomUUID()}.webp`;
    const [{ id }] = await as<{ id: number }>(
      A,
      `insert into public.thread_images (thread_id, storage_key, content_type, width, height, size_bytes)
       values ($1, $2, 'image/webp', 800, 600, 90000) returning id`,
      [threads.rejected, key],
    );
    assert.ok(await editedAt(threads.rejected));

    await sql("update public.threads set edited_at = null where id = $1", [threads.rejected]);
    await as(A, "delete from public.thread_images where id = $1", [id]);
    assert.ok(await editedAt(threads.rejected));
    assert.deepEqual(await sql("select 1 from public.thread_revisions where thread_id = $1", [threads.rejected]), []);
  });

  test("a moderator moving it, or the author editing a pending thread, does not", async () => {
    const [{ id: other }] = await sql<{ id: number }>("select id from public.categories where slug = 'jobs'");
    await as(MOD, "update public.threads set category_id = $2, city = 'nuremberg' where id = $1", [threads.rejected, other]);
    assert.equal(await editedAt(threads.rejected), null);
    await as(A, "update public.threads set body = 'More details' where id = $1", [threads.pending]);
    assert.equal(await editedAt(threads.pending), null);
  });

  test("clients still cannot write edited_at themselves", async () => {
    assert.match(
      (await errorOf(() => as(A, "update public.threads set edited_at = now() - interval '1 day' where id = $1", [threads.rejected]))).message,
      /permission denied for table threads/,
    );
    assert.equal(await editedAt(threads.rejected), null);
  });
});

describe("rejection and approval", () => {
  test("only a thread waiting for review can be rejected; a rejected thread can still be approved", async () => {
    const [rejected] = await as<{ status: string }>(
      MOD, "update public.threads set status = 'rejected', rejection_reason = 'Duplicate' where id = $1 returning status", [threads.pending],
    );
    assert.equal(rejected.status, "rejected");
    await as(MOD, "update public.threads set rejection_reason = 'Duplicate of the Anmeldung thread' where id = $1", [threads.pending]);

    for (const [actor, thread] of [[MOD, threads.published], [ADMIN, threads.archived]] as const) {
      assert.deepEqual(
        await errorOf(() => as(actor, "update public.threads set status = 'rejected', rejection_reason = 'Spam' where id = $1", [thread])),
        { message: "only threads waiting for review can be rejected", code: "42501" },
      );
    }
    const [approved] = await as<{ status: string }>(
      MOD, "update public.threads set status = 'published' where id = $1 returning status", [threads.rejected],
    );
    assert.equal(approved.status, "published");

    // Seeds and maintenance as postgres too; this aborts the test transaction, so it comes last.
    assert.deepEqual(await errorOf(() => sql("update public.threads set status = 'rejected' where id = $1", [threads.published])), {
      message: "only threads waiting for review can be rejected",
      code: "42501",
    });
  });

  test("approval clears edited_at from fixes made before it", async () => {
    await as(A, "update public.threads set body = 'Added the semester and my programme' where id = $1", [threads.rejected]);
    assert.ok(await editedAt(threads.rejected));
    await sql("update public.threads set edited_at = now() - interval '1 day' where id = $1", [threads.pending]);
    for (const thread of [threads.rejected, threads.pending]) {
      await as(MOD, "update public.threads set status = 'published' where id = $1", [thread]);
      assert.equal(await editedAt(thread), null);
    }
  });

  test("an edit after approval is an edit again", async () => {
    await as(MOD, "update public.threads set status = 'published' where id = $1", [threads.rejected]);
    await as(A, "update public.threads set body = 'Updated after approval' where id = $1", [threads.rejected]);
    assert.ok(await editedAt(threads.rejected));
  });

  test("unarchiving keeps edited_at", async () => {
    await sql("update public.threads set edited_at = now() - interval '3 days' where id = $1", [threads.archived]);
    await as(MOD, "update public.threads set status = 'published' where id = $1", [threads.archived]);
    assert.ok(await editedAt(threads.archived));
  });
});

describe("purging rejected threads", () => {
  test("deletes a rejected thread whose rejection and last edit are over 7 days old, queuing its images", async () => {
    await age(threads.rejected, { created: "12 days", reviewed: "8 days", edited: "9 days" });
    const key = await seedImage(threads.rejected, ids.a);
    assert.equal(await purge(), 1);
    assert.equal(await threadExists(threads.rejected), false);
    assert.deepEqual(await queuedKeys(), [key]);
    assert.deepEqual(await sql("select id from public.notifications where type = 'thread_deleted'"), []);
  });

  test("keeps a thread rejected 6 days ago, or exactly 7 days ago", async () => {
    await age(threads.rejected, { created: "20 days", reviewed: "6 days", edited: null });
    const second = await createThread(ids.b, "rejected", "Cheap furniture near the Südgelände?");
    await age(second, { created: "20 days", reviewed: "7 days", edited: null });
    assert.equal(await purge(), 0);
    assert.equal(await threadExists(threads.rejected), true);
    assert.equal(await threadExists(second), true);
  });

  test("keeps an old rejection the author edited 2 days ago", async () => {
    await age(threads.rejected, { created: "30 days", reviewed: "20 days", edited: "2 days" });
    assert.equal(await purge(), 0);
    assert.equal(await threadExists(threads.rejected), true);
  });

  test("an edit through the app keeps an old rejection", async () => {
    await age(threads.rejected, { created: "30 days", reviewed: "20 days", edited: null });
    await as(A, "update public.threads set body = 'Fixed what the moderator asked for' where id = $1", [threads.rejected]);
    assert.equal(await purge(), 0);
    assert.equal(await threadExists(threads.rejected), true);
  });

  test("a rejection without a review time counts from the thread's creation", async () => {
    await age(threads.rejected, { created: "8 days", reviewed: null, edited: null });
    assert.equal(await purge(), 1);
    assert.equal(await threadExists(threads.rejected), false);
  });

  test("never touches pending, published or archived threads", async () => {
    const old = { created: "60 days", reviewed: "50 days", edited: null };
    const keys = [];
    for (const thread of [threads.pending, threads.published, threads.archived]) {
      await age(thread, old);
      keys.push(await seedImage(thread, ids.a));
    }
    assert.equal(await purge(), 0);
    for (const thread of [threads.pending, threads.published, threads.archived]) assert.equal(await threadExists(thread), true);
    assert.deepEqual(await queuedKeys(), []);
  });

  test("members, moderators, the superadmin and anon cannot run it", async () => {
    await age(threads.rejected, { created: "12 days", reviewed: "8 days", edited: null });
    for (const actor of [anon, A, MOD, ADMIN]) {
      assert.match(
        (await errorOf(() => as(actor, "select public.purge_rejected_threads()"))).message,
        /permission denied for function purge_rejected_threads/,
      );
    }
    assert.equal(await threadExists(threads.rejected), true);
  });
});
