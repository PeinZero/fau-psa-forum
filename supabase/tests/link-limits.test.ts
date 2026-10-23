// Link limits for new accounts. The harness (Supabase roles, auth.uid(), personas, seed data,
// rolled-back transactions) is in harness.mjs.
import { beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { A, MOD, as, ids, setupDatabase, sql, threads } from "./harness.mjs";
import type { Actor } from "./harness.mjs";

setupDatabase();

const LIMIT = /new accounts cannot post links yet/;
const post = (actor: Actor, body: string) =>
  as<{ id: number }>(actor, "insert into public.comments (thread_id, body) values ($1, $2) returning id", [threads.published, body]);

// Seed: Ayesha (A) has 2 comments. Make the account a week old, so the comment count decides.
beforeEach(async () => {
  await sql("update public.profiles set created_at = now() - interval '7 days'");
  await sql("update public.comments set created_at = now() - interval '3 days'");
});

describe("link limits", () => {
  test("detects schemes, www and markdown links but not plain text", async () => {
    const [row] = await sql<{ yes: boolean[]; no: boolean[] }>(
      `select array[public.contains_link('see https://fau.de'), public.contains_link('WWW.fau.de'),
                    public.contains_link('[here](/t/abc)')] as yes,
              array[public.contains_link('no link here'), public.contains_link('mail a@b.de')] as no`,
    );
    assert.deepEqual(row.yes, [true, true, true]);
    assert.deepEqual(row.no, [false, false]);
  });

  test("a member with fewer than 3 comments cannot post a link", async () => {
    await assert.rejects(post(A, "Check https://example.com for details"), LIMIT);
  });

  test("plain comments are never affected", async () => {
    await post(A, "No link in this one");
  });

  test("a brand-new account cannot post a link even with enough comments", async () => {
    await sql("insert into public.comments (thread_id, author_id, body) values ($1, $2, 'one'), ($1, $2, 'two')", [threads.published, ids.a]);
    await sql("update public.profiles set created_at = now() where id = $1", [ids.a]);
    await assert.rejects(post(A, "[docs](https://example.com)"), LIMIT);
  });

  test("a week-old account with 3 comments can post links", async () => {
    await sql("insert into public.comments (thread_id, author_id, body, created_at) values ($1, $2, 'three', now() - interval '3 days')", [threads.published, ids.a]);
    await post(A, "See www.example.com");
  });

  test("editing a comment to add a link is also rejected", async () => {
    const [{ id }] = await post(A, "Plain at first");
    await assert.rejects(as(A, "update public.comments set body = 'now https://spam.example' where id = $1", [id]), LIMIT);
  });

  test("editing a comment that already contains a link is not blocked again", async () => {
    await sql("insert into public.comments (thread_id, author_id, body) values ($1, $2, 'old https://x.example')", [threads.published, ids.a]);
    const [{ id }] = await sql<{ id: number }>("select id from public.comments where body like 'old %'");
    await as(A, "update public.comments set hidden_at = null where id = $1", [id]);
  });

  test("moderators and the service role are exempt", async () => {
    await sql("update public.profiles set created_at = now() where id = $1", [ids.mod]);
    await post(MOD, "Official: https://fau.de");
    await sql("insert into public.comments (thread_id, author_id, body) values ($1, $2, 'seed https://x.example')", [threads.published, ids.a]);
  });
});
