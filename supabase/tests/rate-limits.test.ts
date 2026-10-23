// Rate limits on comments, threads, reports and votes. The harness (Supabase roles, auth.uid(),
// personas, seed data, rolled-back transactions) is in harness.mjs.
import { beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { A, B, MOD, as, ids, setupDatabase, sql, threads, comments, categories } from "./harness.mjs";
import type { Actor } from "./harness.mjs";

setupDatabase();

const RATE = /rate limit: /;

// The seed's own rows would otherwise count towards every member's window.
beforeEach(async () => {
  await sql("update public.comments set created_at = now() - interval '3 days'");
  await sql("update public.threads set created_at = now() - interval '3 days'");
});

const comment = (actor: Actor, body = "A comment") =>
  as(actor, "insert into public.comments (thread_id, body) values ($1, $2)", [threads.published, body]);
const age = (table: string, column: string, user: string, interval: string) =>
  sql(`update public.${table} set created_at = now() - $2::interval where ${column} = $1`, [user, interval]);

describe("comment rate limits", () => {
  test("a sixth comment within a minute is rejected with a friendly message", async () => {
    for (let n = 0; n < 5; n++) await comment(A);
    await assert.rejects(comment(A), /rate limit: You are commenting too fast/);
  });

  test("the limit is per member", async () => {
    for (let n = 0; n < 5; n++) await comment(A);
    await comment(B);
  });

  test("older comments stop counting after a minute", async () => {
    for (let n = 0; n < 5; n++) await comment(A);
    await age("comments", "author_id", ids.a, "2 minutes");
    await comment(A);
  });

  test("the daily cap applies even when comments are spread over the day", async () => {
    for (let n = 0; n < 100; n++) {
      await sql("insert into public.comments (thread_id, author_id, body, created_at) values ($1, $2, 'old', now() - interval '2 hours')", [
        threads.published,
        ids.a,
      ]);
    }
    await assert.rejects(comment(A), /daily comment limit/);
  });

  test("moderators are not limited", async () => {
    for (let n = 0; n < 8; n++) await comment(MOD);
  });

  test("the service role is not limited", async () => {
    for (let n = 0; n < 8; n++) {
      await sql("insert into public.comments (thread_id, author_id, body) values ($1, $2, 'seed')", [threads.published, ids.a]);
    }
  });

  test("replies count like comments", async () => {
    for (let n = 0; n < 5; n++) {
      await as(A, "insert into public.comments (thread_id, parent_id, body) values ($1, $2, 'reply')", [threads.published, comments.visible]);
    }
    await assert.rejects(comment(A), RATE);
  });
});

describe("thread rate limits", () => {
  const post = (actor: Actor) =>
    as(actor, "insert into public.threads (title, body, category_id) values ($1, 'Body text', $2)", [`A thread ${Math.random()}`, categories.courses]);

  test("an eleventh thread in a day is rejected", async () => {
    for (let n = 0; n < 10; n++) {
      await sql("insert into public.threads (title, body, category_id, author_id, status, created_at) values ($1, 'Body text', $2, $3, 'published', now() - interval '3 hours')", [
        `Earlier thread ${n}`,
        categories.courses,
        ids.a,
      ]);
    }
    await assert.rejects(post(A), /daily limit for new threads/);
  });

  test("the cap on threads waiting for review still applies first", async () => {
    await sql("delete from public.threads where author_id = $1 and status = 'pending'", [ids.a]);
    for (let n = 0; n < 3; n++) await post(A);
    await assert.rejects(post(A), /3 threads waiting for review/);
  });

  test("moderators are not limited", async () => {
    for (let n = 0; n < 11; n++) await post(MOD);
  });
});

describe("report rate limits", () => {
  test("an eleventh report in an hour is rejected even when earlier ones were resolved", async () => {
    for (let n = 0; n < 10; n++) {
      await sql(
        "insert into public.reports (reporter_id, comment_id, reason, status) values ($1, $2, 'spam', 'dismissed')",
        [ids.a, comments.visible],
      );
    }
    await assert.rejects(
      as(A, "insert into public.reports (comment_id, reason) values ($1, 'spam')", [comments.onOther]),
      /many reports in the last hour/,
    );
  });

  test("reports older than an hour stop counting", async () => {
    for (let n = 0; n < 10; n++) {
      await sql("insert into public.reports (reporter_id, comment_id, reason, status) values ($1, $2, 'spam', 'dismissed')", [
        ids.a,
        comments.visible,
      ]);
    }
    await age("reports", "reporter_id", ids.a, "2 hours");
    await as(A, "insert into public.reports (comment_id, reason) values ($1, 'spam')", [comments.onOther]);
  });
});

describe("vote rate limits", () => {
  test("a thirty-first new vote within a minute is rejected", async () => {
    for (let n = 0; n < 30; n++) {
      const [row] = await sql<{ id: number }>(
        "insert into public.comments (thread_id, author_id, body) values ($1, $2, 'to vote on') returning id",
        [threads.published, ids.b],
      );
      await as(A, "insert into public.comment_votes (comment_id, value) values ($1, 1)", [row.id]);
    }
    const [extra] = await sql<{ id: number }>(
      "insert into public.comments (thread_id, author_id, body) values ($1, $2, 'one more') returning id",
      [threads.published, ids.b],
    );
    await assert.rejects(as(A, "insert into public.comment_votes (comment_id, value) values ($1, 1)", [extra.id]), /voting too fast/);
  });

  test("changing or withdrawing a vote is not limited", async () => {
    const [row] = await sql<{ id: number }>(
      "insert into public.comments (thread_id, author_id, body) values ($1, $2, 'to vote on') returning id",
      [threads.published, ids.b],
    );
    await as(A, "insert into public.comment_votes (comment_id, value) values ($1, 1)", [row.id]);
    await as(A, "update public.comment_votes set value = -1 where comment_id = $1", [row.id]);
    await as(A, "delete from public.comment_votes where comment_id = $1", [row.id]);
  });
});
