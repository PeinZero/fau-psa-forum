// Restricting members: moderator-only management and blocked posting. The harness (Supabase roles,
// auth.uid(), personas, seed data, rolled-back transactions) is in harness.mjs.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { A, B, MOD, ADMIN, anon, as, categories, comments, ids, setupDatabase, sql, threads } from "./harness.mjs";

setupDatabase();

const restrict = (actor = MOD, target = ids.a, reason: string | null = "Posting spam") =>
  as(actor, "select public.set_user_restricted($1, true, $2)", [target, reason]);
const lift = (actor = MOD, target = ids.a) => as(actor, "select public.set_user_restricted($1, false)", [target]);

const BLOCKED = /your account is restricted/;

describe("managing restrictions", () => {
  test("a moderator restricts and lifts a member; the reason is stored", async () => {
    await restrict();
    const [row] = await sql<{ reason: string; restricted_by: string }>("select * from public.user_restrictions where user_id = $1", [ids.a]);
    assert.equal(row.reason, "Posting spam");
    assert.equal(row.restricted_by, ids.mod);
    await lift();
    assert.equal((await sql("select 1 from public.user_restrictions")).length, 0);
  });

  test("a reason is required", async () => {
    await assert.rejects(restrict(MOD, ids.a, "  "), /a reason is required/);
  });

  test("members and anonymous visitors cannot restrict anyone", async () => {
    await assert.rejects(restrict(B), /only moderators can restrict/);
    await assert.rejects(as(anon, "select public.set_user_restricted($1, true, 'x')", [ids.a]), /permission denied/);
  });

  test("moderators and the superadmin cannot be restricted", async () => {
    await assert.rejects(restrict(ADMIN, ids.mod), /moderators cannot be restricted/);
    await assert.rejects(restrict(MOD, ids.admin), /moderators cannot be restricted/);
  });

  test("only moderators read the reasons", async () => {
    await restrict();
    assert.equal((await as(MOD, "select * from public.user_restrictions")).length, 1);
    assert.equal((await as(A, "select * from public.user_restrictions")).length, 0);
    assert.equal((await as(B, "select * from public.user_restrictions")).length, 0);
  });

  test("members cannot write the table directly", async () => {
    await assert.rejects(as(B, "insert into public.user_restrictions (user_id, reason) values ($1, 'x')", [ids.a]), /permission denied|row-level security/);
    await assert.rejects(as(MOD, "insert into public.user_restrictions (user_id, reason) values ($1, 'x')", [ids.b]), /permission denied|row-level security/);
    await restrict();
    assert.equal((await as(A, "delete from public.user_restrictions returning user_id")).length, 0);
    assert.equal((await as(MOD, "delete from public.user_restrictions returning user_id")).length, 0);
  });
});

describe("a restricted member", () => {
  test("cannot comment, post threads, report or vote", async () => {
    await restrict();
    await assert.rejects(as(A, "insert into public.comments (thread_id, body) values ($1, 'hello')", [threads.published]), BLOCKED);
    await assert.rejects(
      as(A, "insert into public.threads (title, body, category_id) values ('A valid title here', 'Body', $1)", [categories.courses]),
      BLOCKED,
    );
    await assert.rejects(as(A, "insert into public.reports (comment_id, reason) values ($1, 'spam')", [comments.visible]), BLOCKED);
    await assert.rejects(as(A, "insert into public.comment_votes (comment_id, value) values ($1, 1)", [comments.visible]), BLOCKED);
  });

  test("cannot edit an existing comment", async () => {
    await restrict();
    await assert.rejects(as(A, "update public.comments set body = 'edited' where id = $1", [comments.onOther]), BLOCKED);
  });

  test("still reads the forum and other members are unaffected", async () => {
    await restrict();
    assert.ok((await as(A, "select * from public.threads where status = 'published'")).length > 0);
    await as(B, "insert into public.comments (thread_id, body) values ($1, 'still fine')", [threads.published]);
  });

  test("posts again once the restriction is lifted", async () => {
    await restrict();
    await lift();
    await as(A, "insert into public.comments (thread_id, body) values ($1, 'back again')", [threads.published]);
  });
});
