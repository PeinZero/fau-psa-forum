// Reputation ledger: points from votes and best answers, kept in step with the cached profile totals.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { A, ADMIN, B, MOD, anon, as, comments, createComment, createUser, ids, setupDatabase, sql, threads } from "./harness.mjs";
import type { Actor } from "./harness.mjs";

setupDatabase();

// The statement supabase-js sends for upsert({ comment_id, value }, { onConflict: "comment_id,user_id" }).
const vote = (actor: Actor, comment: number, value: number) =>
  as(
    actor,
    `insert into public.comment_votes (comment_id, value) values ($1, $2)
     on conflict (comment_id, user_id) do update set comment_id = excluded.comment_id, value = excluded.value`,
    [comment, value],
  );
const unvote = (actor: Actor, comment: number) => as(actor, "delete from public.comment_votes where comment_id = $1", [comment]);
const setBest = (actor: Actor, thread: number, comment: number | null) =>
  as(actor, "update public.threads set best_comment_id = $1 where id = $2", [comment, thread]);

const totals = async (user: string) =>
  (await sql<{ reputation: number; best_answer_count: number }>(
    "select reputation, best_answer_count from public.profiles where id = $1",
    [user],
  ))[0];
const events = (user: string) =>
  sql<{ points: number; reason: string; comment_id: number | null }>(
    "select points, reason, comment_id from public.reputation_events where user_id = $1 order by id",
    [user],
  );

// Totals are only trusted if they match the ledger, including after cascades.
const expectLedgerMatchesCache = async () => {
  const rows = await sql("select p.id from public.profiles p where p.reputation <> coalesce((select sum(points) from public.reputation_events e where e.user_id = p.id), 0)");
  assert.deepEqual(rows, []);
  const best = await sql(
    `select p.id from public.profiles p where p.best_answer_count <>
       coalesce((select sum(sign(points)) from public.reputation_events e where e.user_id = p.id and reason = 'best_answer'), 0)`,
  );
  assert.deepEqual(best, []);
};

describe("reputation basics", () => {
  test("totals start at 0 and are publicly readable", async () => {
    const rows = await as<{ reputation: number; best_answer_count: number }>(
      anon,
      "select reputation, best_answer_count from public.profiles where id = $1",
      [ids.a],
    );
    assert.deepEqual(rows, [{ reputation: 0, best_answer_count: 0 }]);
    assert.deepEqual(await sql("select * from public.reputation_events"), []);
  });

  test("clients cannot write the ledger or the cached totals", async () => {
    for (const actor of [B, anon]) {
      await assert.rejects(
        as(actor, "insert into public.reputation_events (user_id, points, reason) values ($1, 100, 'upvote')", [ids.b]),
        /permission denied/,
      );
    }
    await assert.rejects(as(B, "update public.profiles set reputation = 100 where id = $1", [ids.b]), /permission denied/);
    await assert.rejects(as(B, "update public.profiles set best_answer_count = 5 where id = $1", [ids.b]), /permission denied/);
  });

  test("the ledger is private: anon and members cannot read it", async () => {
    await vote(A, comments.visible, -1);
    for (const actor of [anon, A, B, MOD]) {
      await assert.rejects(as(actor, "select * from public.reputation_events"), /permission denied/);
    }
  });

  test("the trigger guard holds even if a column grant is widened", async () => {
    await sql("grant update (reputation) on public.profiles to authenticated");
    await assert.rejects(
      as(B, "update public.profiles set reputation = 100 where id = $1", [ids.b]),
      /reputation changes only through votes and best answers/,
    );
    assert.equal((await totals(ids.b)).reputation, 0);
  });
});

describe("reputation from votes", () => {
  test("an upvote gives +1 and a downvote -1 to the comment author, with ledger rows", async () => {
    await vote(A, comments.visible, 1);
    assert.equal((await totals(ids.b)).reputation, 1);
    await vote(MOD, comments.visible, -1);
    assert.equal((await totals(ids.b)).reputation, 0);
    assert.deepEqual(await events(ids.b), [
      { points: 1, reason: "upvote", comment_id: comments.visible },
      { points: -1, reason: "downvote", comment_id: comments.visible },
    ]);
    assert.equal((await totals(ids.a)).reputation, 0);
  });

  test("changing a vote from up to down moves 2 points; the same value again changes nothing", async () => {
    await vote(A, comments.visible, 1);
    await vote(A, comments.visible, 1);
    assert.equal((await totals(ids.b)).reputation, 1);
    assert.equal((await events(ids.b)).length, 1);
    await vote(A, comments.visible, -1);
    assert.equal((await totals(ids.b)).reputation, -1);
    assert.deepEqual(await events(ids.b), [
      { points: 1, reason: "upvote", comment_id: comments.visible },
      { points: -1, reason: "upvote", comment_id: comments.visible },
      { points: -1, reason: "downvote", comment_id: comments.visible },
    ]);
    await vote(A, comments.visible, -1);
    assert.equal((await events(ids.b)).length, 3);
  });

  test("removing a vote reverses it with a negated ledger row", async () => {
    await vote(A, comments.visible, 1);
    await unvote(A, comments.visible);
    assert.equal((await totals(ids.b)).reputation, 0);
    assert.deepEqual(await events(ids.b), [
      { points: 1, reason: "upvote", comment_id: comments.visible },
      { points: -1, reason: "upvote", comment_id: comments.visible },
    ]);
    await vote(A, comments.visible, -1);
    await unvote(A, comments.visible);
    assert.equal((await totals(ids.b)).reputation, 0);
    assert.deepEqual((await events(ids.b)).slice(2), [
      { points: -1, reason: "downvote", comment_id: comments.visible },
      { points: 1, reason: "downvote", comment_id: comments.visible },
    ]);
  });

  test("self-votes never give points", async () => {
    await sql("insert into public.comment_votes (comment_id, user_id, value) values ($1, $2, 1)", [comments.visible, ids.b]);
    assert.equal((await sql("select 1 from public.comment_votes where user_id = $1", [ids.b])).length, 1);
    assert.deepEqual(await events(ids.b), []);
    assert.equal((await totals(ids.b)).reputation, 0);
    await sql("update public.comment_votes set value = -1 where user_id = $1", [ids.b]);
    await sql("delete from public.comment_votes where user_id = $1", [ids.b]);
    assert.deepEqual(await events(ids.b), []);
  });

  test("deleting a voter's account takes back the points their votes gave", async () => {
    await vote(A, comments.visible, 1);
    await vote(MOD, comments.visible, 1);
    assert.equal((await totals(ids.b)).reputation, 2);
    await sql("delete from auth.users where id = $1", [ids.a]);
    assert.equal((await totals(ids.b)).reputation, 1);
    await expectLedgerMatchesCache();
  });

  test("deleting a comment removes the points it earned", async () => {
    await vote(A, comments.visible, 1);
    await vote(MOD, comments.visible, 1);
    await sql("delete from public.comments where id = $1", [comments.visible]);
    assert.equal((await totals(ids.b)).reputation, 0);
    assert.deepEqual(await events(ids.b), []);
  });
});

describe("reputation from best answers", () => {
  test("a best answer gives its author +15 and one best answer", async () => {
    await setBest(MOD, threads.published, comments.visible);
    assert.deepEqual(await totals(ids.b), { reputation: 15, best_answer_count: 1 });
    assert.deepEqual(await events(ids.b), [{ points: 15, reason: "best_answer", comment_id: comments.visible }]);
  });

  test("switching the best answer moves the points; unsetting reverses them", async () => {
    const other = await createComment(threads.published, ids.a, "Also check the Bürgeramt");
    await setBest(MOD, threads.published, comments.visible);
    await setBest(MOD, threads.published, other);
    assert.deepEqual(await totals(ids.b), { reputation: 0, best_answer_count: 0 });
    assert.deepEqual(await totals(ids.a), { reputation: 15, best_answer_count: 1 });
    await setBest(MOD, threads.published, null);
    assert.deepEqual(await totals(ids.a), { reputation: 0, best_answer_count: 0 });
    assert.deepEqual(await events(ids.a), [
      { points: 15, reason: "best_answer", comment_id: other },
      { points: -15, reason: "best_answer", comment_id: other },
    ]);
  });

  test("deleting the best comment takes its points and count with it", async () => {
    await vote(A, comments.visible, 1);
    await setBest(MOD, threads.published, comments.visible);
    assert.deepEqual(await totals(ids.b), { reputation: 16, best_answer_count: 1 });
    await sql("delete from public.comments where id = $1", [comments.visible]);
    assert.deepEqual(await totals(ids.b), { reputation: 0, best_answer_count: 0 });
    await expectLedgerMatchesCache();
  });

  test("the author earns the points whoever picks the best answer", async () => {
    await setBest(MOD, threads.otherPublished, comments.onOther);
    assert.deepEqual(await totals(ids.a), { reputation: 15, best_answer_count: 1 });
  });
});

describe("top_helpers", () => {
  const top = (actor: Actor, since: string) =>
    as<{ user_id: string; username: string; display_name: string; points: number }>(
      actor,
      "select * from public.top_helpers($1::timestamptz)",
      [since],
    );
  const longAgo = "2000-01-01T00:00:00Z";

  test("is callable by anon and lists members with positive totals by points", async () => {
    await vote(A, comments.visible, 1);
    await vote(MOD, comments.visible, 1);
    await vote(B, comments.onOther, 1);
    const rows = await top(anon, longAgo);
    assert.deepEqual(rows.map((r) => [r.user_id, r.points]), [[ids.b, 2], [ids.a, 1]]);
    assert.equal(rows[0].display_name, "Bilal");
    assert.ok(rows[0].username);
  });

  test("members with a zero or negative total are left out", async () => {
    await vote(A, comments.visible, -1);
    assert.deepEqual(await top(anon, longAgo), []);
  });

  test("only events since the given moment count", async () => {
    await vote(A, comments.visible, 1);
    await vote(MOD, comments.visible, 1);
    await sql(
      "update public.reputation_events set created_at = now() - interval '40 days' where id = (select min(id) from public.reputation_events)",
    );
    const [row] = await top(anon, new Date(Date.now() - 30 * 86400_000).toISOString());
    assert.equal(row.points, 1);
    assert.deepEqual(await top(anon, new Date(Date.now() + 86400_000).toISOString()), []);
    assert.equal((await top(anon, longAgo))[0].points, 2);
  });

  test("returns at most 10 members", async () => {
    for (let n = 0; n < 11; n++) {
      const user = await createUser(`helper${n}@example.com`, { full_name: `Helper ${n}` });
      await vote(B, await createComment(threads.published, user, `Helpful answer ${n}`), 1);
    }
    const rows = await top(anon, longAgo);
    assert.equal(rows.length, 10);
    assert.ok(rows.every((r) => r.points === 1));
  });
});

describe("cached totals equal the ledger", () => {
  test("after a mixed sequence of votes, best answers and deletions", async () => {
    const extra = await createComment(threads.otherPublished, ids.b, "A second answer");
    await vote(A, comments.visible, 1);
    await vote(MOD, comments.visible, -1);
    await vote(ADMIN, comments.visible, 1);
    await vote(B, comments.onOther, 1);
    await vote(MOD, extra, 1);
    await vote(MOD, extra, -1);
    await unvote(ADMIN, comments.visible);
    await setBest(MOD, threads.published, comments.visible);
    await setBest(MOD, threads.otherPublished, extra);
    await setBest(MOD, threads.published, null);
    await setBest(MOD, threads.published, comments.visible);
    await sql("delete from public.comments where id = $1", [comments.onOther]);
    await sql("delete from auth.users where id = $1", [ids.mod]);
    await expectLedgerMatchesCache();
    const [b] = await sql<{ reputation: number }>("select reputation from public.profiles where id = $1", [ids.b]);
    assert.ok(b.reputation > 0);
  });
});
