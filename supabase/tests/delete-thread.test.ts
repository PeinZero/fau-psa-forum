// Deleting a thread: moderators and the superadmin only, with a reason that the moderation log
// keeps after the thread is gone; everything that only existed for the thread goes with it, the
// reputation it earned included, and the image keys come back for the storage cleanup. The author
// is told why in a notification that outlives the thread.
import { randomUUID } from "node:crypto";
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { A, ADMIN, B, MOD, anon, as, comments, createThread, createUser, ids, setupDatabase, sql, threads } from "./harness.mjs";
import type { Actor } from "./harness.mjs";

setupDatabase();

type DbError = { message: string; code: string };
type LogRow = {
  actor_id: string | null;
  action: string;
  thread_id: number | null;
  comment_id: number | null;
  target_user_id: string | null;
  reason: string | null;
  details: Record<string, unknown> | null;
};

const deleteThread = async (actor: Actor, thread: number, reason: string | null) =>
  (await as<{ keys: string[] }>(actor, "select public.delete_thread($1, $2) as keys", [thread, reason]))[0].keys;

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

const log = () =>
  sql<LogRow>("select actor_id, action, thread_id, comment_id, target_user_id, reason, details from public.moderation_log order by id");

const threadExists = async (thread: number) => (await sql("select 1 from public.threads where id = $1", [thread])).length === 1;

/** Rows that exist only because of the thread or one of its comments. */
async function leftovers(thread: number, threadComments: number[]) {
  const [row] = await sql<Record<string, number>>(
    `select
       (select count(*) from public.threads where id = $1)::int as threads,
       (select count(*) from public.comments where thread_id = $1 or id = any($2::bigint[]))::int as comments,
       (select count(*) from public.thread_votes where thread_id = $1)::int as thread_votes,
       (select count(*) from public.comment_votes where comment_id = any($2::bigint[]))::int as comment_votes,
       (select count(*) from public.thread_images where thread_id = $1)::int as thread_images,
       (select count(*) from public.bookmarks where thread_id = $1)::int as bookmarks,
       (select count(*) from public.thread_follows where thread_id = $1)::int as thread_follows,
       (select count(*) from public.thread_revisions where thread_id = $1)::int as thread_revisions,
       (select count(*) from public.reports where thread_id = $1 or comment_id = any($2::bigint[]))::int as reports,
       (select count(*) from public.update_requests where thread_id = $1)::int as update_requests,
       (select count(*) from public.notifications where thread_id = $1 or comment_id = any($2::bigint[]))::int as notifications,
       (select count(*) from public.reputation_events where thread_id = $1 or comment_id = any($2::bigint[]))::int as reputation_events`,
    [thread, threadComments],
  );
  return row;
}

const totals = async (user: string) =>
  (await sql<{ reputation: number; best_answer_count: number }>(
    "select reputation, best_answer_count from public.profiles where id = $1",
    [user],
  ))[0];

const expectLedgerMatchesCache = async () => {
  const drift = await sql(
    `select p.id from public.profiles p
     where p.reputation <> coalesce((select sum(points) from public.reputation_events e where e.user_id = p.id), 0)
        or p.best_answer_count <> coalesce(
          (select sum(sign(points)) from public.reputation_events e where e.user_id = p.id and reason = 'best_answer'), 0)`,
  );
  assert.deepEqual(drift, []);
};

const counters = (thread: number) =>
  sql<{ score: number; comment_count: number }>("select score, comment_count from public.threads where id = $1", [thread]);

describe("deleting a thread", () => {
  test("removes the thread and everything that only existed for it, keeps the log and returns the image keys", async () => {
    const title = "How do I extend my residence permit in Erlangen?";
    await as(A, "update public.threads set title = $2 where id = $1", [threads.published, title]);
    const [{ id: reply }] = await as<{ id: number }>(
      A, "insert into public.comments (thread_id, body, parent_id) values ($1, 'Thanks, that helped', $2) returning id",
      [threads.published, comments.visible],
    );
    await as(B, "insert into public.thread_votes (thread_id, value) values ($1, 1)", [threads.published]);
    await as(MOD, "insert into public.thread_votes (thread_id, value) values ($1, 1)", [threads.published]);
    await as(A, "insert into public.comment_votes (comment_id, value) values ($1, 1)", [comments.visible]);
    await as(MOD, "update public.threads set best_comment_id = $2, is_pinned = true where id = $1", [threads.published, comments.visible]);
    await as(B, "insert into public.bookmarks (thread_id) values ($1)", [threads.published]);
    await as(B, "insert into public.reports (thread_id, reason) values ($1, 'wrong_info')", [threads.published]);
    await as(B, "insert into public.reports (comment_id, reason) values ($1, 'spam')", [reply]);
    await as(B, "insert into public.update_requests (thread_id, note) values ($1, 'The fee went up')", [threads.published]);
    const first = await seedImage(threads.published, ids.a);
    const second = await seedImage(threads.published, ids.a);
    const [{ id: guide }] = await sql<{ id: number }>("insert into public.guides (slug, title) values ('arriving-in-erlangen', 'Arriving in Erlangen') returning id");
    await sql(
      "insert into public.guide_steps (guide_id, position, title, body, thread_id) values ($1, 0, 'Extend your residence permit', 'Book early', $2)",
      [guide, threads.published],
    );

    // Votes on someone else's thread and comment must survive.
    await as(A, "insert into public.thread_votes (thread_id, value) values ($1, 1)", [threads.otherPublished]);
    await as(B, "insert into public.comment_votes (comment_id, value) values ($1, 1)", [comments.onOther]);
    const otherBefore = await counters(threads.otherPublished);
    assert.deepEqual(await totals(ids.a), { reputation: 3, best_answer_count: 0 });
    assert.deepEqual(await totals(ids.b), { reputation: 17, best_answer_count: 1 });

    const threadComments = [comments.visible, comments.hidden, reply];
    for (const [table, count] of Object.entries(await leftovers(threads.published, threadComments))) {
      assert.ok(count > 0, `${table} should have rows before the deletion`);
    }
    const logBefore = (await log()).length;

    assert.deepEqual(await deleteThread(MOD, threads.published, "  Contains a passport number  "), [first, second]);
    assert.deepEqual(await queuedKeys(), [first, second].sort());

    assert.deepEqual(await leftovers(threads.published, threadComments), {
      threads: 0, comments: 0, thread_votes: 0, comment_votes: 0, thread_images: 0, bookmarks: 0, thread_follows: 0,
      thread_revisions: 0, reports: 0, update_requests: 0, notifications: 0, reputation_events: 0,
    });

    const entries = await log();
    assert.equal(entries.length, logBefore + 1);
    assert.deepEqual(entries.at(-1), {
      actor_id: ids.mod,
      action: "thread_deleted",
      thread_id: null,
      comment_id: null,
      target_user_id: ids.a,
      reason: "Contains a passport number",
      details: { title },
    });
    for (const entry of entries.slice(0, -1)) {
      assert.deepEqual([entry.thread_id, entry.comment_id, entry.details?.title], [null, null, title], entry.action);
    }

    assert.deepEqual(await totals(ids.a), { reputation: 1, best_answer_count: 0 });
    assert.deepEqual(await totals(ids.b), { reputation: 1, best_answer_count: 0 });
    await expectLedgerMatchesCache();
    assert.deepEqual(await counters(threads.otherPublished), otherBefore);

    const steps = await sql("select title, body, thread_id from public.guide_steps where guide_id = $1", [guide]);
    assert.deepEqual(steps, [{ title: "Extend your residence permit", body: "Book early", thread_id: null }]);
  });

  test("the superadmin deletes threads in any status; a thread without images returns no keys", async () => {
    const key = await seedImage(threads.archived, ids.b);
    assert.deepEqual(await deleteThread(ADMIN, threads.archived, "Outdated and misleading"), [key]);
    assert.deepEqual(await deleteThread(ADMIN, threads.pending, "Duplicate of an existing thread"), []);
    assert.deepEqual(await deleteThread(MOD, threads.rejected, "Spam"), []);
    for (const thread of [threads.archived, threads.pending, threads.rejected]) assert.equal(await threadExists(thread), false);
    const entries = await log();
    assert.deepEqual(
      entries.map((entry) => [entry.actor_id, entry.action, entry.target_user_id, entry.reason]),
      [
        [ids.admin, "thread_deleted", ids.b, "Outdated and misleading"],
        [ids.admin, "thread_deleted", ids.a, "Duplicate of an existing thread"],
        [ids.mod, "thread_deleted", ids.a, "Spam"],
      ],
    );
  });

  test("members, the thread's author included, and anon cannot delete threads", async () => {
    for (const actor of [A, B]) {
      assert.deepEqual(await errorOf(() => deleteThread(actor, threads.published, "Spam")), {
        message: "only moderators can delete threads",
        code: "42501",
      });
    }
    assert.match((await errorOf(() => deleteThread(anon, threads.published, "Spam"))).message, /permission denied for function delete_thread/);
    assert.equal(await threadExists(threads.published), true);
    assert.deepEqual(await log(), []);
  });

  test("a moderator still muted or banned from before moderators could no longer be restricted cannot delete threads", async () => {
    const [{ id: mute }] = await sql<{ id: number }>(
      "insert into public.user_restrictions (user_id, kind, reason, created_by) values ($1, 'mute', 'Deleted threads without asking', $2) returning id",
      [ids.mod, ids.admin],
    );
    assert.deepEqual(await errorOf(() => deleteThread(MOD, threads.published, "Spam")), {
      message: "your account is muted: Deleted threads without asking",
      code: "P0001",
    });
    await as(ADMIN, "select public.lift_restriction($1)", [mute]);
    await sql(
      "insert into public.user_restrictions (user_id, kind, reason, created_by, expires_at) values ($1, 'ban', 'Leaked a member''s address', $2, now() + interval '7 days')",
      [ids.mod, ids.admin],
    );
    const banned = await errorOf(() => deleteThread(MOD, threads.published, "Spam"));
    assert.match(banned.message, /^your account is banned until .+: Leaked a member's address$/);
    assert.equal(banned.code, "P0001");

    assert.equal(await threadExists(threads.published), true);
    assert.deepEqual((await log()).filter((entry) => entry.action === "thread_deleted"), []);
    assert.deepEqual(await queuedKeys(), []);
  });

  test("a restricted member still hears that only moderators delete threads", async () => {
    await as(MOD, "select public.restrict_user($1, 'mute', 'Posting spam')", [ids.a]);
    assert.deepEqual(await errorOf(() => deleteThread(A, threads.published, "Spam")), {
      message: "only moderators can delete threads",
      code: "42501",
    });
  });

  test("nobody deletes a thread directly, past the reason and the log", async () => {
    for (const actor of [A, MOD, ADMIN]) {
      assert.match(
        (await errorOf(() => as(actor, "delete from public.threads where id = $1", [threads.published]))).message,
        /permission denied for table threads/,
      );
    }
    assert.equal(await threadExists(threads.published), true);
  });

  test("a reason of 1 to 1000 characters is required, counted after trimming", async () => {
    for (const reason of [null, "", "   \n "]) {
      assert.deepEqual(await errorOf(() => deleteThread(MOD, threads.published, reason)), {
        message: "a reason is required to delete a thread",
        code: "P0001",
      });
    }
    assert.deepEqual(await errorOf(() => deleteThread(MOD, threads.published, "x".repeat(1001))), {
      message: "the reason can be at most 1000 characters",
      code: "P0001",
    });
    assert.equal(await threadExists(threads.published), true);
    await deleteThread(MOD, threads.published, ` ${"x".repeat(1000)} `);
    assert.equal((await log())[0].reason, "x".repeat(1000));
  });

  test("a missing or already deleted thread is not found", async () => {
    await deleteThread(MOD, threads.otherPublished, "Spam");
    for (const thread of [threads.otherPublished, 999_999]) {
      assert.deepEqual(await errorOf(() => deleteThread(MOD, thread, "Spam")), { message: "thread not found", code: "P0002" });
    }
    assert.equal((await log()).length, 1);
  });
});

describe("the author hears that their thread was deleted", () => {
  type Notice = {
    recipient_id: string;
    actor_id: string | null;
    thread_id: number | null;
    comment_id: number | null;
    details: Record<string, unknown> | null;
  };
  const notices = () =>
    sql<Notice>(
      "select recipient_id, actor_id, thread_id, comment_id, details from public.notifications where type = 'thread_deleted' order by id",
    );

  test("once, from the moderator, with the title and the reason, and the notice outlives the thread", async () => {
    await as(B, "insert into public.thread_follows (thread_id) values ($1) on conflict do nothing", [threads.published]);
    await deleteThread(MOD, threads.published, "  Contains a passport number  ");
    assert.equal(await threadExists(threads.published), false);

    const expected = {
      recipient_id: ids.a,
      actor_id: ids.mod,
      thread_id: null,
      comment_id: null,
      details: { title: "How do I extend my residence permit?", reason: "Contains a passport number" },
    };
    assert.deepEqual(await notices(), [expected]);

    // The author reads it like any other notification and marks it read; nobody else sees it.
    const own = await as<Notice & { read_at: string | null }>(
      A, "select recipient_id, actor_id, thread_id, comment_id, details, read_at from public.notifications where type = 'thread_deleted'",
    );
    assert.deepEqual(own, [{ ...expected, read_at: null }]);
    await as(A, "update public.notifications set read_at = now() where type = 'thread_deleted'");
    for (const actor of [B, MOD, ADMIN]) {
      assert.deepEqual(await as(actor, "select id from public.notifications where type = 'thread_deleted'"), []);
    }
  });

  test("a moderator's thread deleted by the superadmin notifies the moderator", async () => {
    const thread = await createThread(ids.mod, "published", "Office hours of the international office");
    await deleteThread(ADMIN, thread, "Wrong opening hours");
    assert.deepEqual(await notices(), [{
      recipient_id: ids.mod,
      actor_id: ids.admin,
      thread_id: null,
      comment_id: null,
      details: { title: "Office hours of the international office", reason: "Wrong opening hours" },
    }]);
  });

  test("nobody is notified when a moderator deletes their own thread", async () => {
    const thread = await createThread(ids.mod, "published", "Mensa opening hours during the break");
    await deleteThread(MOD, thread, "Posted twice by mistake");
    assert.deepEqual(await notices(), []);
  });

  test("nobody is notified when the author's account is gone", async () => {
    const author = await createUser("former.student@example.com", { full_name: "Former Student" });
    const thread = await createThread(author, "published", "Selling my winter jacket before I leave");
    await sql("delete from auth.users where id = $1", [author]);
    await deleteThread(MOD, thread, "Not about student life");
    assert.equal(await threadExists(thread), false);
    assert.deepEqual(await notices(), []);
  });

  test("an author who muted this type gets nothing; muting other types changes nothing", async () => {
    await as(B, "insert into public.notification_preferences (muted_types) values ('{reply}')");
    await as(A, "insert into public.notification_preferences (muted_types) values ('{thread_deleted}')");
    await deleteThread(MOD, threads.published, "Spam");
    await deleteThread(MOD, threads.otherPublished, "Spam");
    assert.deepEqual((await notices()).map((notice) => notice.recipient_id), [ids.b]);
  });

  test("clients cannot write the details of a notification", async () => {
    await deleteThread(MOD, threads.published, "Spam");
    const [{ id }] = await sql<{ id: number }>("select id from public.notifications where type = 'thread_deleted'");
    for (const actor of [A, MOD, ADMIN]) {
      assert.match(
        (await errorOf(() => as(actor, "update public.notifications set details = '{\"title\": \"Changed\"}' where id = $1", [id]))).message,
        /permission denied for table notifications/,
      );
      assert.match(
        (await errorOf(() => as(actor, "insert into public.notifications (recipient_id, type, details) values ($1, 'thread_deleted', '{}')", [ids.a]))).message,
        /permission denied for table notifications/,
      );
    }
    const [{ details }] = await sql<Notice>("select details from public.notifications where id = $1", [id]);
    assert.deepEqual(details, { title: "How do I extend my residence permit?", reason: "Spam" });
  });

  test("a failed deletion sends nothing", async () => {
    await errorOf(() => deleteThread(MOD, threads.published, "   "));
    await errorOf(() => deleteThread(B, threads.published, "Spam"));
    assert.deepEqual(await notices(), []);
  });
});
