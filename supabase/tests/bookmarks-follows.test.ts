// Bookmarks and thread follows (owner-only, readable threads only), auto-follow triggers and the
// followed_thread_activity notification with its dedupe priority.
import { beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { A, B, MOD, anon, as, comments, createComment, createThread, createUser, ids, setupDatabase, sql, threads } from "./harness.mjs";
import type { Actor } from "./harness.mjs";

setupDatabase();

const owners = (table: "bookmarks" | "thread_follows", thread: number) =>
  sql<{ user_id: string }>(`select user_id from public.${table} where thread_id = $1 order by user_id`, [thread]).then((rows) => rows.map((r) => r.user_id));

const notificationsFor = (comment: number) =>
  sql<{ recipient_id: string; actor_id: string | null; type: string; thread_id: number; comment_id: number }>(
    "select recipient_id, actor_id, type, thread_id, comment_id from public.notifications where comment_id = $1 order by recipient_id",
    [comment],
  );

const typeByRecipient = async (comment: number) =>
  Object.fromEntries((await notificationsFor(comment)).map((n) => [n.recipient_id, n.type]));

const usernameOf = async (id: string) =>
  (await sql<{ username: string }>("select username from public.profiles where id = $1", [id]))[0].username;

const follow = (user: string, thread: number) =>
  sql("insert into public.thread_follows (user_id, thread_id) values ($1, $2) on conflict do nothing", [user, thread]);

beforeEach(async () => {
  await sql("delete from public.notifications");
});

describe("bookmarks", () => {
  const save = (actor: Actor, thread: number) =>
    as(actor, "insert into public.bookmarks (thread_id) values ($1) returning user_id", [thread]);

  test("a member bookmarks a thread as themselves and only sees their own rows", async () => {
    const [row] = await save(A, threads.published);
    assert.equal(row.user_id, ids.a);
    assert.equal((await as(A, "select * from public.bookmarks")).length, 1);
    assert.equal((await as(B, "select * from public.bookmarks")).length, 0);
    assert.equal((await as(MOD, "select * from public.bookmarks")).length, 0);
  });

  test("members delete their own bookmarks only", async () => {
    await save(A, threads.published);
    assert.equal((await as(B, "delete from public.bookmarks returning thread_id")).length, 0);
    assert.equal((await as(A, "delete from public.bookmarks returning thread_id")).length, 1);
    assert.deepEqual(await owners("bookmarks", threads.published), []);
  });

  test("threads the member cannot read cannot be bookmarked, own pending threads can", async () => {
    await assert.rejects(save(B, threads.pending), /row-level security/);
    await save(A, threads.pending);
    assert.deepEqual(await owners("bookmarks", threads.pending), [ids.a]);
  });

  test("the owner column cannot be chosen", async () => {
    await assert.rejects(
      as(A, "insert into public.bookmarks (user_id, thread_id) values ($1, $2)", [ids.b, threads.published]),
      /permission denied/,
    );
  });

  test("anon is locked out", async () => {
    await assert.rejects(save(anon, threads.published), /permission denied/);
    await assert.rejects(as(anon, "select * from public.bookmarks"), /permission denied/);
  });

  test("the same thread cannot be bookmarked twice", async () => {
    await save(A, threads.published);
    await assert.rejects(save(A, threads.published), /duplicate key value|bookmarks_pkey/);
  });

  test("bookmarks go with the thread and with the user", async () => {
    await save(A, threads.published);
    await save(A, threads.otherPublished);
    await sql("delete from public.threads where id = $1", [threads.published]);
    assert.deepEqual(await owners("bookmarks", threads.published), []);
    assert.deepEqual(await owners("bookmarks", threads.otherPublished), [ids.a]);

    const leaver = await createUser("leaver@example.com");
    await save({ role: "authenticated", sub: leaver }, threads.otherPublished);
    await sql("delete from auth.users where id = $1", [leaver]);
    assert.deepEqual(await owners("bookmarks", threads.otherPublished), [ids.a]);
  });
});

describe("thread follows", () => {
  const followAs = (actor: Actor, thread: number) =>
    as(actor, "insert into public.thread_follows (thread_id) values ($1) returning user_id", [thread]);

  test("follows are owner-only like bookmarks", async () => {
    const [row] = await followAs(MOD, threads.published);
    assert.equal(row.user_id, ids.mod);
    assert.deepEqual((await as(MOD, "select user_id from public.thread_follows where thread_id = $1", [threads.published])).map((r) => r.user_id), [ids.mod]);
    assert.equal((await as(B, "select * from public.thread_follows where user_id = $1", [ids.mod])).length, 0);
    await assert.rejects(followAs(B, threads.pending), /row-level security/);
    await assert.rejects(
      as(A, "insert into public.thread_follows (user_id, thread_id) values ($1, $2)", [ids.b, threads.archived]),
      /permission denied/,
    );
    await assert.rejects(followAs(anon, threads.published), /permission denied/);
    await assert.rejects(followAs(MOD, threads.published), /duplicate key value|thread_follows_pkey/);
  });

  test("authors follow their new thread, commenters follow the thread they answer", async () => {
    const created = await createThread(ids.b, "published", "Fresh question");
    assert.deepEqual(await owners("thread_follows", created), [ids.b]);

    await createComment(created, ids.a, "An answer");
    assert.deepEqual(await owners("thread_follows", created), [ids.a, ids.b].sort());
  });

  test("members unfollow by deleting their row only", async () => {
    assert.equal((await as(B, "delete from public.thread_follows where thread_id = $1 and user_id = $2 returning user_id", [threads.published, ids.a])).length, 0);
    assert.equal((await as(A, "delete from public.thread_follows where thread_id = $1 returning user_id", [threads.published])).length, 1);
    assert.ok(!(await owners("thread_follows", threads.published)).includes(ids.a));
  });

  test("commenting again after unfollowing follows the thread again", async () => {
    await as(B, "delete from public.thread_follows where thread_id = $1", [threads.published]);
    assert.ok(!(await owners("thread_follows", threads.published)).includes(ids.b));
    await createComment(threads.published, ids.b, "One more thing");
    assert.ok((await owners("thread_follows", threads.published)).includes(ids.b));
  });

  test("follows go with the thread", async () => {
    await sql("delete from public.threads where id = $1", [threads.published]);
    assert.deepEqual(await owners("thread_follows", threads.published), []);
  });
});

describe("followed_thread_activity notifications", () => {
  let c: string;
  beforeEach(async () => {
    c = await createUser("chidi@example.com", { full_name: "Chidi" });
    await follow(c, threads.published);
  });

  test("a follower is notified once about a new visible comment, the commenter never", async () => {
    await follow(ids.b, threads.published);
    const id = await createComment(threads.published, ids.b, "Updated opening hours");
    const rows = await notificationsFor(id);
    assert.deepEqual(rows.find((n) => n.recipient_id === c), {
      recipient_id: c, actor_id: ids.b, type: "followed_thread_activity", thread_id: threads.published, comment_id: id,
    });
    assert.equal(rows.filter((n) => n.recipient_id === c).length, 1);
    assert.ok(!rows.some((n) => n.recipient_id === ids.b));
  });

  test("the thread author who follows gets only thread_comment", async () => {
    const id = await createComment(threads.published, ids.b, "An answer");
    assert.deepEqual(await typeByRecipient(id), { [ids.a]: "thread_comment", [c]: "followed_thread_activity" });
  });

  test("a mentioned follower gets only the mention", async () => {
    const id = await createComment(threads.published, ids.b, `Ask @${await usernameOf(c)} about it`);
    assert.equal((await typeByRecipient(id))[c], "mention");
    assert.equal((await notificationsFor(id)).filter((n) => n.recipient_id === c).length, 1);
  });

  test("a follower whose comment is replied to gets only the reply", async () => {
    const first = await createComment(threads.published, c, "My answer");
    await sql("delete from public.notifications");
    const [reply] = await sql<{ id: number }>(
      "insert into public.comments (thread_id, author_id, body, parent_id) values ($1, $2, 'Thanks', $3) returning id",
      [threads.published, ids.b, first],
    );
    assert.equal((await typeByRecipient(reply.id))[c], "reply");
    assert.equal((await notificationsFor(reply.id)).filter((n) => n.recipient_id === c).length, 1);
  });

  test("hidden comments and comments on unpublished threads notify nobody", async () => {
    const [hidden] = await sql<{ id: number }>(
      "insert into public.comments (thread_id, author_id, body, hidden_at, hidden_by) values ($1, $2, 'Spam', now(), $3) returning id",
      [threads.published, ids.b, ids.mod],
    );
    assert.equal((await notificationsFor(hidden.id)).length, 0);

    // comments_guard normally keeps comments off unpublished threads; the notify trigger still checks.
    await sql("alter table public.comments disable trigger comments_guard");
    await follow(c, threads.pending);
    const onPending = await createComment(threads.pending, ids.b, "Looks fine");
    assert.equal((await notificationsFor(onPending)).length, 0);
  });

  test("hiding a comment retracts its notifications", async () => {
    const id = await createComment(threads.published, ids.b, "Questionable advice");
    assert.ok((await notificationsFor(id)).length > 0);
    await as(MOD, "update public.comments set hidden_at = now() where id = $1", [id]);
    assert.equal((await notificationsFor(id)).length, 0);
  });

  test("a new best answer reaches followers except the actor and the comment author", async () => {
    await follow(ids.mod, threads.published);
    await as(MOD, "update public.threads set best_comment_id = $2 where id = $1", [threads.published, comments.visible]);
    assert.deepEqual(await typeByRecipient(comments.visible), {
      [ids.a]: "followed_thread_activity",
      [c]: "followed_thread_activity",
      [ids.b]: "best_answer",
    });
    const rows = await notificationsFor(comments.visible);
    assert.ok(rows.every((n) => n.actor_id === ids.mod && n.thread_id === threads.published));
  });
});
