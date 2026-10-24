// Core RLS, trigger and notification rules. The harness (Supabase roles, auth.uid(), personas,
// seed data, one rolled-back transaction per test) lives in harness.mjs.
import { after, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  A, ADMIN, B, MOD, anon, as, categories, comments, createComment, createThread, createUser, db, ids, migrationFiles, migrationSql,
  newDatabase, setupDatabase, sql, supabaseBootstrap, threads,
} from "./harness.mjs";
import type { Actor, Row } from "./harness.mjs";

const reviewFixesMigration = "20261023130000_review_fixes.sql";
const coursesId = () => categories.courses;

const threadIds = async (actor: Actor) =>
  (await as<{ id: number }>(actor, "select id from public.threads order by id")).map((r) => r.id);
const commentIds = async (actor: Actor) =>
  (await as<{ id: number }>(actor, "select id from public.comments order by id")).map((r) => r.id);

setupDatabase();

describe("profiles", () => {
  test("auth user insert creates a member profile with a sensible display name", async () => {
    const long = await createUser("long@example.com", { full_name: `  ${"x".repeat(60)}  ` });
    const short = await createUser("q@example.com");
    const rows = await sql<{ id: string; display_name: string; role: string }>(
      "select id, display_name, role from public.profiles where id = any($1::uuid[])",
      [[ids.a, ids.b, long, short]],
    );
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    assert.equal(byId[ids.a].display_name, "Ayesha Khan");
    assert.equal(byId[ids.b].display_name, "Bilal");
    assert.equal(byId[long].display_name, "x".repeat(40));
    assert.match(byId[short].display_name, /^member-/);
    assert.equal(byId[ids.a].role, "member");
  });

  test("email prefix is used when the provider gives no name", async () => {
    const id = await createUser("sara.ahmed@fau.de");
    const [row] = await sql<{ display_name: string }>("select display_name from public.profiles where id = $1", [id]);
    assert.equal(row.display_name, "sara.ahmed");
  });

  test("anyone reads profiles; members edit only their own name and affiliation", async () => {
    assert.equal((await as(anon, "select * from public.profiles")).length, 4);
    await as(A, "update public.profiles set display_name = 'Ayesha K', affiliation = 'postgrad' where id = $1", [ids.a]);
    const updatedOther = await as(A, "update public.profiles set display_name = 'Hacked' where id = $1 returning id", [ids.b]);
    assert.equal(updatedOther.length, 0);
    await assert.rejects(as(anon, "update public.profiles set display_name = 'Anon' where id = $1", [ids.a]), /permission denied/);
  });

  test("members cannot change their own role, not even with a widened column grant", async () => {
    await assert.rejects(as(A, "update public.profiles set role = 'superadmin' where id = $1", [ids.a]), /permission denied/);
    await sql("grant update (role) on public.profiles to authenticated");
    await assert.rejects(
      as(A, "update public.profiles set role = 'superadmin' where id = $1", [ids.a]),
      /roles change only through set_user_role/,
    );
    await assert.rejects(
      as(ADMIN, "update public.profiles set role = 'member' where id = $1", [ids.admin]),
      /roles change only through set_user_role/,
    );
  });

  test("accounts created before the profile trigger get a profile from the backfill", async () => {
    await sql("alter table auth.users disable trigger on_auth_user_created");
    const early = await createUser("owner.early@example.com", { name: "  Early Owner  " });
    await sql("alter table auth.users enable trigger on_auth_user_created");
    await sql("update public.profiles set display_name = 'Ayesha K' where id = $1", [ids.a]);
    assert.equal((await sql("select 1 from public.profiles where id = $1", [early])).length, 0);

    await db.exec(migrationSql(reviewFixesMigration));

    const rows = await sql<{ id: string; display_name: string; role: string }>(
      "select id, display_name, role from public.profiles where id = any($1::uuid[])",
      [[early, ids.a]],
    );
    const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
    assert.deepEqual(byId[early], { id: early, display_name: "Early Owner", role: "member" });
    assert.equal(byId[ids.a].display_name, "Ayesha K");
  });
});

describe("thread visibility", () => {
  test("anon reads only published and archived threads", async () => {
    assert.deepEqual(await threadIds(anon), [threads.published, threads.archived, threads.otherPublished]);
  });

  test("members see their own pending and rejected threads but not others'", async () => {
    assert.deepEqual(await threadIds(A), Object.values(threads).sort((x, y) => x - y));
    assert.deepEqual(await threadIds(B), [threads.published, threads.archived, threads.otherPublished]);
    const [rejected] = await as<{ rejection_reason: string }>(A, "select rejection_reason from public.threads where id = $1", [threads.rejected]);
    assert.equal(rejected.rejection_reason, "Duplicate");
  });

  test("moderators and the superadmin see every thread", async () => {
    assert.equal((await threadIds(MOD)).length, 5);
    assert.equal((await threadIds(ADMIN)).length, 5);
  });

  test("anon cannot read revisions or applications", async () => {
    await assert.rejects(as(anon, "select * from public.thread_revisions"), /permission denied/);
    await assert.rejects(as(anon, "select * from public.moderator_applications"), /permission denied/);
  });
});

describe("thread submission and editing", () => {
  test("a member submits a pending thread with generated slug and themselves as author", async () => {
    const [row] = await as<{ status: string; slug: string; author_id: string }>(
      B,
      "insert into public.threads (title, body, category_id, city) values ('Anmeldung in Nürnberg?', 'How long does it take?', $1, 'nuremberg') returning status, slug, author_id",
      [coursesId()],
    );
    assert.equal(row.status, "pending");
    assert.equal(row.author_id, ids.b);
    assert.match(row.slug, /^anmeldung-in-n-rnberg-[0-9a-f]{6}$/);
  });

  test("anon cannot submit threads", async () => {
    await assert.rejects(
      as(anon, "insert into public.threads (title, body, category_id) values ('Anonymous question', 'x', $1)", [coursesId()]),
      /permission denied/,
    );
  });

  test("members cannot submit as published or pinned, or on behalf of someone else", async () => {
    await assert.rejects(
      as(B, "insert into public.threads (title, body, category_id, status) values ('Sneaky published', 'x', $1, 'published')", [coursesId()]),
      /permission denied/,
    );
    await assert.rejects(
      as(B, "insert into public.threads (title, body, category_id, is_pinned) values ('Sneaky pinned one', 'x', $1, true)", [coursesId()]),
      /permission denied/,
    );
    await assert.rejects(
      as(B, "insert into public.threads (title, body, category_id, author_id) values ('Impersonation', 'x', $1, $2)", [coursesId(), ids.a]),
      /permission denied/,
    );
  });

  test("the app's insert without author_id makes the caller the author and generates a slug", async () => {
    const [thread] = await as<{ id: number; author_id: string; slug: string; status: string }>(
      A,
      "insert into threads (title, body, category_id, city) values ('Werkstudent hours during semester?', 'Is 20 hours the limit?', $1, 'erlangen') returning id, author_id, slug, status",
      [coursesId()],
    );
    assert.deepEqual(
      { author_id: thread.author_id, status: thread.status },
      { author_id: ids.a, status: "pending" },
    );
    assert.match(thread.slug, /^werkstudent-hours-during-semester-[0-9a-f]{6}$/);

    const [comment] = await as<{ author_id: string }>(
      B,
      "insert into comments (thread_id, body) values ($1, '20 hours a week while lectures run') returning author_id",
      [threads.otherPublished],
    );
    assert.equal(comment.author_id, ids.b);
  });

  test("a 4th pending thread is rejected for members but not for moderators", async () => {
    const submit = (actor: Actor, n: number) =>
      as(actor, "insert into public.threads (title, body, category_id) values ($1, 'body', $2)", [`Question number ${n}`, coursesId()]);
    await submit(A, 2);
    await submit(A, 3);
    await assert.rejects(submit(A, 4), /already have 3 threads waiting/);
    for (const n of [1, 2, 3, 4]) await submit(MOD, n);
  });

  test("members cannot self-publish, pin, outdate, set best answer or reject", async () => {
    const attempts = [
      "status = 'archived'",
      "is_pinned = true",
      "is_outdated = true",
      `best_comment_id = ${comments.visible}`,
      "rejection_reason = 'nope'",
    ];
    for (const set of attempts) {
      await assert.rejects(
        as(A, `update public.threads set ${set} where id = $1`, [threads.published]),
        /only moderators can change moderation fields|best answer/,
        set,
      );
    }
    await assert.rejects(
      as(A, "update public.threads set status = 'published' where id = $1", [threads.pending]),
      /only moderators/,
    );
  });

  test("author, slug and review columns are not writable by clients", async () => {
    for (const set of [`author_id = '${ids.b}'`, "slug = 'custom'", `reviewed_by = '${ids.a}'`, "reviewed_at = now()", "last_activity_at = now() + interval '1 year'"]) {
      await assert.rejects(as(A, `update public.threads set ${set} where id = $1`, [threads.published]), /permission denied/, set);
    }
    await sql("grant update (slug, author_id) on public.threads to authenticated");
    await assert.rejects(as(A, "update public.threads set slug = 'custom' where id = $1", [threads.published]), /read-only/);
    await assert.rejects(as(A, "update public.threads set author_id = $2 where id = $1", [threads.published, ids.b]), /read-only/);
  });

  test("authors edit their own title/body/category/city; others' threads are untouched", async () => {
    const [jobs] = await sql<{ id: number }>("select id from public.categories where slug = 'jobs'");
    const own = await as(A, "update public.threads set title = 'Pending question, clarified', category_id = $2, city = 'erlangen' where id = $1 returning id", [threads.pending, jobs.id]);
    assert.equal(own.length, 1);
    const other = await as(A, "update public.threads set title = 'Vandalised title here' where id = $1 returning id", [threads.otherPublished]);
    assert.equal(other.length, 0);
  });

  test("editing a published thread stores a revision, sets edited_at and keeps the slug", async () => {
    const [before] = await sql<{ slug: string; title: string }>("select slug, title from public.threads where id = $1", [threads.published]);
    await as(A, "update public.threads set title = 'How do I extend my RP in Erlangen?' where id = $1", [threads.published]);
    const [afterEdit] = await sql<{ slug: string; edited_at: Date | null }>("select slug, edited_at from public.threads where id = $1", [threads.published]);
    assert.equal(afterEdit.slug, before.slug);
    assert.ok(afterEdit.edited_at);

    assert.equal((await as(A, "select * from public.thread_revisions")).length, 0);
    const revisions = await as<{ title: string; edited_by: string }>(MOD, "select title, edited_by from public.thread_revisions where thread_id = $1", [threads.published]);
    assert.deepEqual(revisions, [{ title: before.title, edited_by: ids.a }]);
  });

  test("editing a pending thread or only changing the city writes no revision", async () => {
    await as(A, "update public.threads set title = 'Pending question, edited' where id = $1", [threads.pending]);
    await as(A, "update public.threads set city = 'both' where id = $1", [threads.published]);
    const [count] = await sql<{ n: number }>("select count(*)::int as n from public.thread_revisions");
    assert.equal(count.n, 0);
  });

  test("a moderator editing someone else's pending thread writes a revision without edited_at", async () => {
    const [edited] = await as<{ title: string; edited_at: Date | null }>(
      MOD,
      "update public.threads set title = 'Pending question, curated', category_id = $2 where id = $1 returning title, edited_at",
      [threads.pending, coursesId()],
    );
    assert.deepEqual(edited, { title: "Pending question, curated", edited_at: null });
    const revisions = await as<{ title: string; edited_by: string }>(MOD, "select title, edited_by from public.thread_revisions where thread_id = $1", [threads.pending]);
    assert.deepEqual(revisions, [{ title: "Pending question from Ayesha", edited_by: ids.mod }]);
  });

  test("a moderator editing someone else's published thread is recorded like an author edit", async () => {
    await as(MOD, "update public.threads set body = 'Bring your Anmeldung and passport' where id = $1", [threads.published]);
    const revisions = await as<{ body: string; edited_by: string }>(MOD, "select body, edited_by from public.thread_revisions where thread_id = $1", [threads.published]);
    assert.deepEqual(revisions, [{ body: "Bring your Anmeldung", edited_by: ids.mod }]);
  });
});

describe("comments", () => {
  test("members comment on published threads, which bumps last_activity_at", async () => {
    const [before] = await sql<{ last_activity_at: Date }>("select last_activity_at from public.threads where id = $1", [threads.otherPublished]);
    await sql("update public.threads set last_activity_at = now() - interval '1 day' where id = $1", [threads.otherPublished]);
    const [row] = await as<{ author_id: string }>(B, "insert into public.comments (thread_id, body) values ($1, 'Second-hand shop near Erlangen Arcaden') returning author_id", [threads.otherPublished]);
    assert.equal(row.author_id, ids.b);
    const [afterComment] = await sql<{ last_activity_at: Date }>("select last_activity_at from public.threads where id = $1", [threads.otherPublished]);
    assert.ok(afterComment.last_activity_at.getTime() >= before.last_activity_at.getTime());
  });

  test("comments are blocked on pending, rejected and archived threads", async () => {
    for (const thread of [threads.pending, threads.rejected]) {
      await assert.rejects(
        as(A, "insert into public.comments (thread_id, body) values ($1, 'hello')", [thread]),
        /only possible on published threads/,
      );
    }
    for (const actor of [B, MOD]) {
      await assert.rejects(
        as(actor, "insert into public.comments (thread_id, body) values ($1, 'hello')", [threads.archived]),
        /only possible on published threads/,
      );
    }
  });

  test("anon cannot comment and members cannot comment as someone else", async () => {
    await assert.rejects(as(anon, "insert into public.comments (thread_id, body) values ($1, 'hi')", [threads.published]), /permission denied/);
    await assert.rejects(
      as(B, "insert into public.comments (thread_id, author_id, body) values ($1, $2, 'hi')", [threads.published, ids.a]),
      /permission denied/,
    );
  });

  test("hidden comments are invisible to anon, members and their author, visible to moderators", async () => {
    const visible = [comments.visible, comments.onOther];
    assert.deepEqual(await commentIds(anon), visible);
    assert.deepEqual(await commentIds(A), visible);
    assert.deepEqual(await commentIds(B), visible);
    assert.deepEqual(await commentIds(MOD), [comments.visible, comments.hidden, comments.onOther]);
  });

  test("authors edit their own comments but cannot hide them", async () => {
    const [row] = await as<{ edited_at: Date | null }>(B, "update public.comments set body = 'Edited: bring a Sperrkonto statement' where id = $1 returning edited_at", [comments.visible]);
    assert.ok(row.edited_at);
    assert.equal((await as(A, "update public.comments set body = 'hijack' where id = $1 returning id", [comments.visible])).length, 0);
    await assert.rejects(as(B, "update public.comments set hidden_at = now() where id = $1", [comments.visible]), /only moderators can hide/);
    await assert.rejects(as(B, "update public.comments set hidden_by = $2 where id = $1", [comments.visible, ids.b]), /permission denied/);
  });

  test("moderators cannot rewrite someone else's comment, only hide it", async () => {
    for (const actor of [MOD, ADMIN]) {
      await assert.rejects(
        as(actor, "update public.comments set body = 'Words the author never wrote' where id = $1", [comments.visible]),
        /only the author can edit a comment/,
      );
    }
    await assert.rejects(
      as(MOD, "update public.comments set body = 'Edited while hiding', hidden_at = now() where id = $1", [comments.visible]),
      /only the author can edit a comment/,
    );
    const [hidden] = await as<{ body: string; hidden_by: string }>(MOD, "update public.comments set hidden_at = now() where id = $1 returning body, hidden_by", [comments.visible]);
    assert.deepEqual(hidden, { body: "The Ausländerbehörde needs a Sperrkonto statement", hidden_by: ids.mod });
  });

  test("authors cannot edit their comment once a moderator hid it", async () => {
    // No WHERE or RETURNING: the select policy would otherwise filter the hidden row on its own.
    await as(A, "update public.comments set body = 'Totally legit now'");
    const rows = await sql<{ id: number; body: string }>("select id, body from public.comments where author_id = $1 order by id", [ids.a]);
    assert.deepEqual(rows, [
      { id: comments.hidden, body: "Spam about cryptocurrency giveaway" },
      { id: comments.onOther, body: "Totally legit now" },
    ]);
  });

  test("moderators hide and unhide comments; hidden_by records who did it", async () => {
    const [hidden] = await as<{ hidden_by: string }>(MOD, "update public.comments set hidden_at = now() where id = $1 returning hidden_by", [comments.visible]);
    assert.equal(hidden.hidden_by, ids.mod);
    assert.deepEqual(await commentIds(anon), [comments.onOther]);
    const [shown] = await as<{ hidden_by: string | null }>(MOD, "update public.comments set hidden_at = null where id = $1 returning hidden_by", [comments.hidden]);
    assert.equal(shown.hidden_by, null);
  });
});

describe("moderation", () => {
  test("moderators approve and reject, recording the reviewer", async () => {
    const [approved] = await as<{ status: string; reviewed_by: string; reviewed_at: Date }>(MOD, "update public.threads set status = 'published' where id = $1 returning status, reviewed_by, reviewed_at", [threads.pending]);
    assert.equal(approved.status, "published");
    assert.equal(approved.reviewed_by, ids.mod);
    assert.ok(approved.reviewed_at);
    assert.ok((await threadIds(anon)).includes(threads.pending));

    const [rejected] = await as<{ status: string; reviewed_by: string }>(ADMIN, "update public.threads set status = 'rejected', rejection_reason = 'Off topic' where id = $1 returning status, reviewed_by", [threads.otherPublished]);
    assert.deepEqual(rejected, { status: "rejected", reviewed_by: ids.admin });
  });

  test("approving a pending or rejected thread moves it to the top of the lists", async () => {
    const dayAgo = "now() - interval '1 day'";
    await sql(`update public.threads set last_activity_at = ${dayAgo} where id = any($1::bigint[])`, [[threads.pending, threads.rejected, threads.archived]]);
    for (const id of [threads.pending, threads.rejected]) {
      const [row] = await as<{ bumped: boolean }>(MOD, "update public.threads set status = 'published' where id = $1 returning last_activity_at = now() as bumped", [id]);
      assert.equal(row.bumped, true);
    }
    const [unarchived] = await as<{ bumped: boolean }>(MOD, "update public.threads set status = 'published' where id = $1 returning last_activity_at = now() as bumped", [threads.archived]);
    assert.equal(unarchived.bumped, false);
  });

  test("moderators archive, mark outdated and pin", async () => {
    await as(MOD, "update public.threads set status = 'archived', is_outdated = true, is_pinned = true where id = $1", [threads.published]);
    const [row] = await sql<Row>("select status, is_outdated, is_pinned from public.threads where id = $1", [threads.published]);
    assert.deepEqual(row, { status: "archived", is_outdated: true, is_pinned: true });
    await assert.rejects(
      as(A, "insert into public.comments (thread_id, body) values ($1, 'still open?')", [threads.published]),
      /only possible on published threads/,
    );
  });

  test("best answer must be a visible comment of the same thread", async () => {
    await as(MOD, "update public.threads set best_comment_id = $2 where id = $1", [threads.published, comments.visible]);
    await assert.rejects(
      as(MOD, "update public.threads set best_comment_id = $2 where id = $1", [threads.published, comments.onOther]),
      /best answer must be a visible comment of this thread/,
    );
    await assert.rejects(
      as(MOD, "update public.threads set best_comment_id = $2 where id = $1", [threads.published, comments.hidden]),
      /best answer must be a visible comment of this thread/,
    );
  });
});

describe("moderator applications", () => {
  const apply = (actor: Actor) =>
    as<{ id: number; status: string; user_id: string }>(
      actor,
      "insert into public.moderator_applications (motivation) values ('I have lived in Erlangen for five years.') returning id, status, user_id",
    );

  test("a member applies once; a second pending application is blocked", async () => {
    const [app] = await apply(B);
    assert.deepEqual({ status: app.status, user_id: app.user_id }, { status: "pending", user_id: ids.b });
    await assert.rejects(apply(B), /duplicate key value|moderator_applications_one_pending_idx/);
    assert.equal((await as(A, "select * from public.moderator_applications")).length, 0);
    assert.equal((await as(MOD, "select * from public.moderator_applications")).length, 1);
  });

  test("moderators and the superadmin cannot apply; anon cannot apply", async () => {
    await assert.rejects(apply(MOD), /row-level security/);
    await assert.rejects(apply(ADMIN), /row-level security/);
    await assert.rejects(apply(anon), /permission denied/);
  });

  test("members cannot approve applications themselves", async () => {
    const [app] = await apply(B);
    await assert.rejects(as(B, "update public.moderator_applications set status = 'approved' where id = $1", [app.id]), /permission denied/);
    await assert.rejects(as(B, "select public.review_moderator_application($1, 'approved')", [app.id]), /only moderators/);
    await assert.rejects(as(anon, "select public.review_moderator_application($1, 'approved')", [app.id]), /permission denied for function/);
  });

  test("a moderator approves, which makes the applicant a moderator", async () => {
    const [app] = await apply(B);
    await as(MOD, "select public.review_moderator_application($1, 'approved')", [app.id]);
    const [profile] = await sql<{ role: string }>("select role from public.profiles where id = $1", [ids.b]);
    assert.equal(profile.role, "moderator");
    const [row] = await sql<Row>("select status, reviewed_by from public.moderator_applications where id = $1", [app.id]);
    assert.deepEqual(row, { status: "approved", reviewed_by: ids.mod });
    await assert.rejects(as(ADMIN, "select public.review_moderator_application($1, 'rejected')", [app.id]), /already reviewed/);
  });

  test("rejection keeps the member role and allows a new application", async () => {
    const [app] = await apply(B);
    await as(ADMIN, "select public.review_moderator_application($1, 'rejected')", [app.id]);
    const [profile] = await sql<{ role: string }>("select role from public.profiles where id = $1", [ids.b]);
    assert.equal(profile.role, "member");
    await apply(B);
  });

  test("nobody reviews their own application", async () => {
    const [{ id }] = await sql<{ id: number }>(
      "insert into public.moderator_applications (user_id, motivation) values ($1, 'Applied before I became a moderator.') returning id",
      [ids.mod],
    );
    await assert.rejects(as(MOD, "select public.review_moderator_application($1, 'approved')", [id]), /cannot review your own/);
  });
});

describe("roles", () => {
  test("only the superadmin changes roles", async () => {
    await assert.rejects(as(MOD, "select public.set_user_role($1, 'moderator')", [ids.a]), /only the superadmin/);
    await assert.rejects(as(A, "select public.set_user_role($1, 'superadmin')", [ids.a]), /only the superadmin/);
    await assert.rejects(as(anon, "select public.set_user_role($1, 'superadmin')", [ids.a]), /permission denied for function/);
    await as(ADMIN, "select public.set_user_role($1, 'moderator')", [ids.a]);
    await as(ADMIN, "select public.set_user_role($1, 'member')", [ids.mod]);
    const rows = await sql<{ id: string; role: string }>("select id, role from public.profiles where id = any($1::uuid[])", [[ids.a, ids.mod]]);
    assert.deepEqual(Object.fromEntries(rows.map((r) => [r.id, r.role])), { [ids.a]: "moderator", [ids.mod]: "member" });
  });

  test("the last superadmin cannot be demoted", async () => {
    await assert.rejects(as(ADMIN, "select public.set_user_role($1, 'member')", [ids.admin]), /last superadmin/);
    await as(ADMIN, "select public.set_user_role($1, 'superadmin')", [ids.b]);
    await as(ADMIN, "select public.set_user_role($1, 'moderator')", [ids.admin]);
    const [row] = await sql<{ role: string }>("select role from public.profiles where id = $1", [ids.admin]);
    assert.equal(row.role, "moderator");
  });
});

describe("categories", () => {
  test("seeded categories are public and ordered", async () => {
    const rows = await as<{ name: string }>(anon, "select name from public.categories order by sort_order");
    assert.deepEqual(rows.map((r) => r.name), ["RP & Visa", "Courses", "Accommodation", "Jobs", "First Steps", "Other"]);
  });

  test("moderators create and rename categories; members cannot", async () => {
    const [created] = await as<{ id: number; created_by: string }>(MOD, "insert into public.categories (slug, name, sort_order) values ('health', 'Health', 70) returning id, created_by");
    assert.equal(created.created_by, ids.mod);
    assert.equal((await as(MOD, "update public.categories set name = 'Health & Insurance' where id = $1 returning id", [created.id])).length, 1);
    await assert.rejects(as(A, "insert into public.categories (slug, name) values ('spam', 'Spam')"), /row-level security/);
    assert.equal((await as(A, "update public.categories set name = 'Hacked' where id = $1 returning id", [coursesId()])).length, 0);
  });

  test("only the superadmin deletes categories, and only empty ones", async () => {
    const [{ id }] = await sql<{ id: number }>("select id from public.categories where slug = 'other'");
    assert.equal((await as(MOD, "delete from public.categories where id = $1 returning id", [id])).length, 0);
    assert.equal((await as(ADMIN, "delete from public.categories where id = $1 returning id", [id])).length, 1);
    await assert.rejects(as(ADMIN, "delete from public.categories where id = $1", [coursesId()]), /foreign key/);
  });
});

describe("search_threads", () => {
  const search = async (actor: Actor, q: string) =>
    (await as<{ id: number }>(actor, "select id from public.search_threads($1)", [q])).map((r) => r.id);

  test("finds published threads by title, body and visible comment", async () => {
    assert.deepEqual(await search(anon, "residence permit"), [threads.published]);
    assert.deepEqual(await search(anon, "Anmeldung"), [threads.published]);
    assert.deepEqual(await search(anon, "Sperrkonto"), [threads.published]);
    assert.deepEqual(await search(anon, "flea market"), [threads.otherPublished]);
  });

  test("includes archived threads, excludes pending threads and hidden comments", async () => {
    assert.deepEqual(await search(anon, "semesterticket"), [threads.archived]);
    assert.deepEqual(await search(A, "pending question"), []);
    assert.deepEqual(await search(MOD, "pending question"), []);
    assert.deepEqual(await search(MOD, "cryptocurrency"), []);
  });

  test("title matches rank before body and comment matches", async () => {
    await sql("update public.threads set body = 'Ask about the Erlangen residence permit office' where id = $1", [threads.archived]);
    await createComment(threads.otherPublished, ids.a, "residence permit renewed without problems");
    const ranked = await search(anon, "residence permit");
    assert.equal(ranked[0], threads.published);
    assert.deepEqual([...ranked].sort(), [threads.published, threads.archived, threads.otherPublished].sort());
  });
});

describe("reports", () => {
  const report = (actor: Actor, target: { thread?: number; comment?: number }, reason = "spam", details: string | null = null) =>
    as<{ id: number; reporter_id: string; status: string }>(
      actor,
      "insert into public.reports (thread_id, comment_id, reason, details) values ($1, $2, $3, $4) returning id, reporter_id, status",
      [target.thread ?? null, target.comment ?? null, reason, details],
    );

  test("members report published and archived threads and visible comments", async () => {
    const [onThread] = await report(B, { thread: threads.published }, "wrong_info", "The Ausländerbehörde moved to a new address");
    assert.deepEqual({ reporter_id: onThread.reporter_id, status: onThread.status }, { reporter_id: ids.b, status: "open" });
    await report(B, { thread: threads.archived }, "offensive");
    await report(A, { comment: comments.visible }, "personal_data");
    assert.equal((await as(MOD, "select * from public.reports")).length, 3);
  });

  test("pending threads of others, hidden comments and missing targets cannot be reported", async () => {
    await assert.rejects(report(B, { thread: threads.pending }), /row-level security/);
    await assert.rejects(report(B, { thread: threads.rejected }), /row-level security/);
    await assert.rejects(report(B, { comment: comments.hidden }), /row-level security/);
    await assert.rejects(report(B, { thread: 999999 }), /row-level security/);
    await assert.rejects(report(B, {}), /row-level security|reports_one_target/);
    await assert.rejects(report(B, { thread: threads.published, comment: comments.visible }), /reports_one_target/);
  });

  test("reporters cannot set status, resolver or someone else as reporter", async () => {
    await assert.rejects(
      as(B, "insert into public.reports (thread_id, reason, status) values ($1, 'spam', 'resolved')", [threads.published]),
      /permission denied/,
    );
    await assert.rejects(
      as(B, "insert into public.reports (thread_id, reason, reporter_id) values ($1, 'spam', $2)", [threads.published, ids.a]),
      /permission denied/,
    );
    await assert.rejects(report(B, { thread: threads.published }, "other", "x".repeat(501)), /check constraint/);
  });

  test("a second open report on the same target is rejected; after a decision it is allowed", async () => {
    await report(B, { comment: comments.onOther });
    await assert.rejects(report(B, { comment: comments.onOther }, "offensive"), /reports_one_open_per_target_idx/);
    await report(A, { comment: comments.visible });
    await as(MOD, "update public.reports set status = 'dismissed'");
    await report(B, { comment: comments.onOther });
  });

  test("an 11th open report is rejected for members but not for moderators", async () => {
    const targets = [threads.published, threads.archived, threads.otherPublished];
    for (let n = 0; n < 8; n++) targets.push(await createThread(ids.a, "published", `Published question number ${n}`));
    for (const thread of targets.slice(0, 10)) await report(B, { thread });
    await assert.rejects(report(B, { thread: targets[10] }), /you already have 10 open reports/);
    for (const thread of targets) await report(MOD, { thread });
  });

  test("members read only their own reports and cannot decide them; anon gets nothing", async () => {
    const [own] = await report(B, { thread: threads.published });
    await report(A, { comment: comments.visible });
    assert.deepEqual((await as<{ id: number }>(B, "select id from public.reports")).map((r) => r.id), [own.id]);
    assert.equal((await as(B, "update public.reports set status = 'resolved' returning id")).length, 0);
    await assert.rejects(as(B, "update public.reports set resolved_by = $1", [ids.b]), /permission denied/);
    await assert.rejects(as(anon, "select * from public.reports"), /permission denied/);
    await assert.rejects(as(anon, "insert into public.reports (thread_id, reason) values ($1, 'spam')", [threads.published]), /permission denied/);
    const [row] = await sql<{ status: string }>("select status from public.reports where id = $1", [own.id]);
    assert.equal(row.status, "open");
  });

  test("moderators resolve reports, recording who and when; reopening clears it", async () => {
    const [{ id }] = await report(B, { thread: threads.published });
    const [resolved] = await as<{ status: string; resolved_by: string; resolved_at: Date | null }>(
      MOD,
      "update public.reports set status = 'resolved' where id = $1 returning status, resolved_by, resolved_at",
      [id],
    );
    assert.equal(resolved.resolved_by, ids.mod);
    assert.ok(resolved.resolved_at);
    const [reopened] = await as<Row>(ADMIN, "update public.reports set status = 'open' where id = $1 returning resolved_by, resolved_at", [id]);
    assert.deepEqual(reopened, { resolved_by: null, resolved_at: null });
    await assert.rejects(as(MOD, "update public.reports set reason = 'other' where id = $1", [id]), /permission denied/);
  });

  test("deleting the reported thread or comment removes its reports", async () => {
    await report(B, { comment: comments.visible });
    await report(A, { thread: threads.otherPublished });
    await sql("delete from public.comments where id = $1", [comments.visible]);
    await sql("delete from public.threads where id = $1", [threads.otherPublished]);
    assert.equal((await sql("select 1 from public.reports")).length, 0);
  });
});

describe("account deletion", () => {
  test("deleting an auth user keeps their threads and comments with author_id null", async () => {
    await sql("delete from auth.users where id = $1", [ids.a]);
    assert.equal((await sql("select 1 from public.profiles where id = $1", [ids.a])).length, 0);
    const rows = await sql<{ author_id: string | null }>("select author_id from public.threads where id = any($1::bigint[])", [[threads.published, threads.pending]]);
    assert.deepEqual(rows, [{ author_id: null }, { author_id: null }]);
    const [comment] = await sql<{ author_id: string | null }>("select author_id from public.comments where id = $1", [comments.onOther]);
    assert.equal(comment.author_id, null);
    assert.ok((await threadIds(anon)).includes(threads.published));
  });

  test("delete_own_account removes the caller's account and keeps their content as a deleted user", async () => {
    const [{ id: reportId }] = await as<{ id: number }>(A, "insert into public.reports (comment_id, reason) values ($1, 'spam') returning id", [comments.visible]);
    await as(A, "insert into public.moderator_applications (motivation) values ('I have lived in Erlangen for five years.')");

    await as(A, "select public.delete_own_account()");

    assert.equal((await sql("select 1 from auth.users where id = $1", [ids.a])).length, 0);
    assert.equal((await sql("select 1 from public.profiles where id = $1", [ids.a])).length, 0);
    assert.equal((await sql("select 1 from public.moderator_applications where user_id = $1", [ids.a])).length, 0);
    const threadAuthors = await sql<{ author_id: string | null }>("select author_id from public.threads where id = any($1::bigint[])", [[threads.published, threads.pending, threads.rejected]]);
    assert.deepEqual(threadAuthors, [{ author_id: null }, { author_id: null }, { author_id: null }]);
    const commentAuthors = await sql<{ author_id: string | null }>("select author_id from public.comments where id = any($1::bigint[])", [[comments.hidden, comments.onOther]]);
    assert.deepEqual(commentAuthors, [{ author_id: null }, { author_id: null }]);
    const [reportRow] = await sql<{ reporter_id: string | null }>("select reporter_id from public.reports where id = $1", [reportId]);
    assert.equal(reportRow.reporter_id, null);
    assert.ok((await commentIds(anon)).includes(comments.onOther));
    assert.equal((await sql("select 1 from public.profiles where id = $1", [ids.b])).length, 1);
  });

  test("the last superadmin cannot delete their account until another superadmin exists", async () => {
    await assert.rejects(as(ADMIN, "select public.delete_own_account()"), /the last superadmin cannot delete their account/);
    assert.equal((await sql("select 1 from public.profiles where id = $1", [ids.admin])).length, 1);
    await as(ADMIN, "select public.set_user_role($1, 'superadmin')", [ids.b]);
    await as(ADMIN, "select public.delete_own_account()");
    assert.equal((await sql("select 1 from public.profiles where id = $1", [ids.admin])).length, 0);
  });

  test("anon cannot call delete_own_account", async () => {
    await assert.rejects(as(anon, "select public.delete_own_account()"), /permission denied for function/);
    assert.equal((await sql("select 1 from public.profiles")).length, 4);
  });
});

describe("replies", () => {
  const reply = (actor: Actor, thread: number, parent: number, body = "Same here, it took two weeks") =>
    as<{ id: number; parent_id: number }>(
      actor,
      "insert into public.comments (thread_id, parent_id, body) values ($1, $2, $3) returning id, parent_id",
      [thread, parent, body],
    );

  test("a reply attaches to its comment; replying to a reply attaches to the top-level comment", async () => {
    const [first] = await reply(A, threads.published, comments.visible);
    assert.equal(first.parent_id, comments.visible);
    const [nested] = await reply(B, threads.published, first.id);
    assert.equal(nested.parent_id, comments.visible);
  });

  test("the parent must be a visible comment of the same thread", async () => {
    await assert.rejects(reply(A, threads.otherPublished, comments.visible), /same thread/);
    await assert.rejects(reply(B, threads.published, comments.hidden), /same thread/);
    await assert.rejects(reply(B, threads.published, 999999), /same thread/);
  });

  test("replies cannot be moved, stay visible when the parent is hidden and go when it is deleted", async () => {
    const [first] = await reply(A, threads.published, comments.visible);
    await assert.rejects(as(A, "update public.comments set parent_id = null where id = $1", [first.id]), /permission denied/);
    await as(MOD, "update public.comments set hidden_at = now() where id = $1", [comments.visible]);
    assert.ok((await commentIds(anon)).includes(first.id));
    await sql("delete from public.comments where id = $1", [comments.visible]);
    assert.equal((await sql("select 1 from public.comments where id = $1", [first.id])).length, 0);
  });
});

describe("usernames", () => {
  const usernameOf = async (id: string) =>
    (await sql<{ username: string }>("select username from public.profiles where id = $1", [id]))[0].username;

  test("new users get a handle from their display name, suffixed on conflict and never reserved", async () => {
    assert.equal(await usernameOf(ids.a), "ayesha_khan");
    assert.equal(await usernameOf(ids.b), "bilal");
    assert.equal(await usernameOf(ids.mod), "mo_derator");
    const created = {
      twin: await createUser("ayesha2@example.com", { full_name: "Ayesha  Khan!" }),
      admin: await createUser("admin@example.com", { full_name: "Admin" }),
      short: await createUser("bo@example.com", { full_name: "Bo" }),
      symbols: await createUser("x@example.com", { full_name: "+++" }),
      long: await createUser("long1@example.com", { full_name: "Muhammad Abdullah Rehman Siddiqui" }),
      longTwin: await createUser("long2@example.com", { full_name: "Muhammad Abdullah Rehman Siddiqui" }),
      staffWord: await createUser("ali@example.com", { full_name: "Ali Admin Khan" }),
      onlyStaffWords: await createUser("help@example.com", { full_name: "Support-Team" }),
      modName: await createUser("modassir@example.com", { full_name: "Modassir" }),
    };
    const names = Object.fromEntries(await Promise.all(Object.entries(created).map(async ([k, id]) => [k, await usernameOf(id)])));
    assert.deepEqual(names, {
      twin: "ayesha_khan2",
      admin: "user",
      short: "bo_user",
      symbols: "user2",
      long: "muhammad_abdullah_re",
      longTwin: "muhammad_abdullah_r2",
      staffWord: "ali_khan",
      onlyStaffWords: "team",
      modName: "modassir",
    });
  });

  test("users change their own handle; it is stored lowercase and unique regardless of case", async () => {
    const [row] = await as<{ username: string }>(A, "update public.profiles set username = ' Ayesha_K ' where id = $1 returning username", [ids.a]);
    assert.equal(row.username, "ayesha_k");
    await assert.rejects(as(B, "update public.profiles set username = 'AYESHA_K' where id = $1", [ids.b]), /username is already taken/);
    await as(A, "update public.profiles set username = 'ayesha_k', display_name = 'Ayesha K' where id = $1", [ids.a]);
    assert.equal((await as(A, "update public.profiles set username = 'hijack' where id = $1 returning id", [ids.b])).length, 0);
    await assert.rejects(as(anon, "update public.profiles set username = 'anon_user' where id = $1", [ids.a]), /permission denied/);
  });

  test("reserved and malformed handles are rejected", async () => {
    for (const name of ["Admin", "settings", "null", "fau_psa_admin", "the_moderator", "SupportDesk", "administrator"]) {
      await assert.rejects(as(A, "update public.profiles set username = $2 where id = $1", [ids.a, name]), /username is reserved/, name);
    }
    for (const name of ["ab", "has space", "x".repeat(21), "émile", "a-b-c", ""]) {
      await assert.rejects(as(A, "update public.profiles set username = $2 where id = $1", [ids.a, name]), /username must be 3 to 20 characters/, name);
    }
    await assert.rejects(as(A, "update public.profiles set username = null where id = $1", [ids.a]), /username must be 3 to 20 characters/);
  });

  test("names merely containing mod are accepted", async () => {
    for (const name of ["modassir", "mo_derator2", "ahmed_mod", "sport_fan"]) {
      const [row] = await as<{ username: string }>(A, "update public.profiles set username = $2 where id = $1 returning username", [ids.a, name]);
      assert.equal(row.username, name);
    }
  });

  test("handles that became reserved stay valid until their owner changes them", async () => {
    await sql("alter table public.profiles disable trigger profiles_set_username");
    await sql("update public.profiles set username = 'bilal_admin' where id = $1", [ids.b]);
    await sql("alter table public.profiles enable trigger profiles_set_username");
    const [row] = await as<{ username: string }>(B, "update public.profiles set display_name = 'Bilal A' where id = $1 returning username", [ids.b]);
    assert.equal(row.username, "bilal_admin");
    await assert.rejects(as(B, "update public.profiles set username = 'bilal_admin2' where id = $1", [ids.b]), /username is reserved/);
  });
});

describe("mentions", () => {
  const mentioned = async (body: string) =>
    (await sql<{ id: string }>("select m as id from public.mentioned_user_ids($1) m", [body])).map((r) => r.id).sort();

  test("@handles resolve case-insensitively; emails, unknown and repeated handles are ignored", async () => {
    assert.deepEqual(
      await mentioned("@Bilal ask @mo_derator, or mail bilal@example.com; @nobody_here, @bilal again\n@ayesha_khan."),
      [ids.a, ids.b, ids.mod].sort(),
    );
    assert.deepEqual(await mentioned("@bilal_x is not @bilal"), [ids.b]);
  });

  test("only the first 10 distinct handles in a body count", async () => {
    const unknown = Array.from({ length: 10 }, (_, n) => `@ghost_${n}`).join(" ");
    assert.deepEqual(await mentioned(`${unknown} @bilal`), []);
    assert.deepEqual(await mentioned(`@bilal ${unknown}`), [ids.b]);
  });

  test("clients cannot call the resolver", async () => {
    await assert.rejects(as(A, "select public.mentioned_user_ids('@bilal')"), /permission denied for function/);
  });
});

describe("notifications", () => {
  type Note = { recipient_id: string; actor_id: string | null; type: string; thread_id: number | null; comment_id: number | null };
  const notes = (where = "true", params: unknown[] = []) =>
    sql<Note>(`select recipient_id, actor_id, type::text as type, thread_id, comment_id from public.notifications where ${where} order by id`, params);
  const note = (recipient: string, actor: string | null, type: string, thread: number | null = null, comment: number | null = null): Note =>
    ({ recipient_id: recipient, actor_id: actor, type, thread_id: thread, comment_id: comment });
  const comment = async (actor: Actor, thread: number, body: string, parent: number | null = null) =>
    (await as<{ id: number }>(actor, "insert into public.comments (thread_id, parent_id, body) values ($1, $2, $3) returning id", [thread, parent, body]))[0].id;
  const submit = async (actor: Actor, body: string) =>
    (await as<{ id: number }>(actor, "insert into public.threads (title, body, category_id) values ('Blocked account at Sparkasse', $1, $2) returning id", [body, coursesId()]))[0].id;

  beforeEach(async () => {
    await sql("delete from public.notifications");
  });

  test("a comment notifies the thread author, never the commenter", async () => {
    const id = await comment(B, threads.published, "Book the appointment online");
    assert.deepEqual(await notes(), [note(ids.a, ids.b, "thread_comment", threads.published, id)]);
    await comment(A, threads.published, "Thanks, @ayesha_khan will do");
    assert.equal((await notes("recipient_id = $1", [ids.a])).length, 1);
  });

  test("one notification per recipient and comment: reply beats mention beats thread_comment", async () => {
    const top = await comment(MOD, threads.published, "Check the city website");
    await sql("delete from public.notifications");
    const id = await comment(B, threads.published, "@mo_derator @ayesha_khan @bilal see the second floor", top);
    assert.deepEqual(
      (await notes()).sort((x, y) => x.recipient_id.localeCompare(y.recipient_id)),
      [note(ids.mod, ids.b, "reply", threads.published, id), note(ids.a, ids.b, "mention", threads.published, id)]
        .sort((x, y) => x.recipient_id.localeCompare(y.recipient_id)),
    );
  });

  test("editing a comment notifies only newly mentioned users who were not notified about it", async () => {
    const id = await comment(B, threads.published, "Ask at the office");
    await as(B, "update public.comments set body = 'Ask @mo_derator or @ayesha_khan' where id = $1", [id]);
    await as(B, "update public.comments set body = 'Ask @mo_derator, @ayesha_khan or @owner' where id = $1", [id]);
    assert.deepEqual(await notes(), [
      note(ids.a, ids.b, "thread_comment", threads.published, id),
      note(ids.mod, ids.b, "mention", threads.published, id),
      note(ids.admin, ids.b, "mention", threads.published, id),
    ]);
  });

  const mentionTargets = async (count: number) => {
    const handles: string[] = [];
    for (let n = 0; n < count; n++) {
      await createUser(`target${n}@example.com`, { full_name: `Target ${n}` });
      handles.push(`target_${n}`);
    }
    return handles;
  };
  const mentionsOf = async (where: string, params: unknown[]) =>
    (await sql<{ username: string }>(
      `select p.username from public.notifications n join public.profiles p on p.id = n.recipient_id
       where n.type = 'mention' and ${where}`,
      params,
    )).map((r) => r.username).sort();
  const at = (handles: string[]) => handles.map((h) => `@${h}`).join(" ");

  test("edits never push a comment past 10 mention notifications; the first named win", async () => {
    const t = await mentionTargets(25);
    const id = await comment(B, threads.published, `Ask ${at(t.slice(0, 4))}`);
    await as(B, "update public.comments set body = $2 where id = $1", [id, `Ask ${at(t.slice(4, 14))}`]);
    await as(B, "update public.comments set body = $2 where id = $1", [id, `Ask ${at(t.slice(14, 24))}`]);
    await as(B, "update public.comments set body = $2 where id = $1", [id, `Ask ${at(t.slice(24))}`]);
    assert.deepEqual(await mentionsOf("n.comment_id = $1", [id]), t.slice(0, 10).sort());
  });

  test("edits never push a published thread past 10 mention notifications", async () => {
    const t = await mentionTargets(25);
    for (const batch of [t.slice(0, 10), t.slice(10, 20), t.slice(20)]) {
      await as(A, "update public.threads set body = $2 where id = $1", [threads.published, `Ask ${at(batch)}`]);
    }
    assert.deepEqual(await mentionsOf("n.thread_id = $1 and n.comment_id is null", [threads.published]), t.slice(0, 10).sort());
  });

  test("hiding a comment withdraws the notifications about it", async () => {
    const id = await comment(B, threads.published, "Spam with a link, @owner");
    await as(MOD, "update public.comments set hidden_at = now() where id = $1", [id]);
    assert.deepEqual(await notes(), []);
  });

  test("pending threads notify moderators only; mentions fire once at approval and for new ones on edit", async () => {
    const id = await submit(A, "Did @bilal manage to open one?");
    assert.deepEqual(await notes(), [note(ids.mod, ids.a, "mod_new_thread", id), note(ids.admin, ids.a, "mod_new_thread", id)]);
    await as(A, "update public.threads set body = 'Did @bilal or @owner manage?' where id = $1", [id]);
    assert.equal((await notes("type = 'mention'")).length, 0);

    await sql("delete from public.notifications");
    await as(MOD, "update public.threads set status = 'published' where id = $1", [id]);
    assert.deepEqual(await notes(), [
      note(ids.a, ids.mod, "thread_approved", id),
      note(ids.b, ids.a, "mention", id),
      note(ids.admin, ids.a, "mention", id),
    ]);

    await as(A, "update public.threads set body = 'Did @bilal, @owner or @mo_derator manage? @ayesha_khan' where id = $1", [id]);
    await as(A, "update public.threads set title = 'Blocked account at Sparkasse, solved' where id = $1", [id]);
    assert.deepEqual(await notes("type = 'mention' and recipient_id = $1", [ids.mod]), [note(ids.mod, ids.a, "mention", id)]);
    assert.equal((await notes("type = 'mention'")).length, 3);
  });

  test("a moderator's own submission goes live at once: no queue notice, mentions fire", async () => {
    const id = await submit(MOD, "Which documents does the Ausländerbehörde want, @bilal?");
    const [thread] = await sql<{ status: string; reviewed_by: string }>("select status, reviewed_by from public.threads where id = $1", [id]);
    assert.deepEqual({ ...thread }, { status: "published", reviewed_by: ids.mod });
    assert.deepEqual(await notes(), [note(ids.b, ids.mod, "mention", id)]);
  });

  test("rejection notifies the author", async () => {
    await as(MOD, "update public.threads set status = 'rejected', rejection_reason = 'Duplicate' where id = $1", [threads.pending]);
    assert.deepEqual(await notes(), [note(ids.a, ids.mod, "thread_rejected", threads.pending)]);
  });

  test("best answer notifies the comment author unless they picked it themselves", async () => {
    await as(MOD, "update public.threads set best_comment_id = $2 where id = $1", [threads.published, comments.visible]);
    assert.deepEqual(await notes("type = 'best_answer'"), [note(ids.b, ids.mod, "best_answer", threads.published, comments.visible)]);
    const own = await comment(MOD, threads.otherPublished, "The bike market on Saturdays");
    await sql("delete from public.notifications");
    await as(MOD, "update public.threads set best_comment_id = $2 where id = $1", [threads.otherPublished, own]);
    assert.deepEqual(await notes("type = 'best_answer'"), []);
  });

  test("applications notify moderators, decisions notify the applicant", async () => {
    const apply = async (actor: Actor) =>
      (await as<{ id: number }>(actor, "insert into public.moderator_applications (motivation) values ('I have lived in Erlangen for five years.') returning id"))[0].id;
    const fromB = await apply(B);
    const fromA = await apply(A);
    assert.deepEqual(await notes(), [
      note(ids.mod, ids.b, "mod_new_application"),
      note(ids.admin, ids.b, "mod_new_application"),
      note(ids.mod, ids.a, "mod_new_application"),
      note(ids.admin, ids.a, "mod_new_application"),
    ]);
    await sql("delete from public.notifications");
    await as(MOD, "select public.review_moderator_application($1, 'approved')", [fromB]);
    await as(ADMIN, "select public.review_moderator_application($1, 'rejected')", [fromA]);
    assert.deepEqual(await notes(), [note(ids.b, ids.mod, "application_approved"), note(ids.a, ids.admin, "application_rejected")]);
  });

  test("reports notify every moderator except the reporter", async () => {
    await as(B, "insert into public.reports (comment_id, reason) values ($1, 'spam')", [comments.onOther]);
    assert.deepEqual(await notes(), [
      note(ids.mod, ids.b, "mod_new_report", threads.otherPublished, comments.onOther),
      note(ids.admin, ids.b, "mod_new_report", threads.otherPublished, comments.onOther),
    ]);
    await sql("delete from public.notifications");
    await as(MOD, "insert into public.reports (thread_id, reason) values ($1, 'wrong_info')", [threads.archived]);
    assert.deepEqual(await notes(), [note(ids.admin, ids.mod, "mod_new_report", threads.archived)]);
  });

  test("recipients read and mark only their own notifications; clients never write them otherwise", async () => {
    await comment(B, threads.published, "Ask @mo_derator");
    await comment(A, threads.otherPublished, "Try the flea market on Saturday");
    const [own] = await as<{ id: number; type: string }>(A, "select id, type from public.notifications");
    assert.equal((await as(A, "select id from public.notifications")).length, 1);
    assert.equal(own.type, "thread_comment");
    const [ofB] = await sql<{ id: number }>("select id from public.notifications where recipient_id = $1", [ids.b]);

    assert.equal((await as(A, "update public.notifications set read_at = now() where id = $1 returning id", [ofB.id])).length, 0);
    assert.equal((await as(A, "update public.notifications set read_at = now() where id = $1 returning id", [own.id])).length, 1);
    await assert.rejects(as(A, "update public.notifications set recipient_id = $2 where id = $1", [own.id, ids.b]), /permission denied/);
    await assert.rejects(as(A, "update public.notifications set type = 'reply' where id = $1", [own.id]), /permission denied/);
    await assert.rejects(as(A, "insert into public.notifications (recipient_id, type) values ($1, 'reply')", [ids.b]), /permission denied/);
    await assert.rejects(as(A, "delete from public.notifications where id = $1", [own.id]), /permission denied/);
  });

  test("mark_all_notifications_read covers only the caller's notifications; anon gets nothing", async () => {
    await comment(B, threads.published, "Ask @mo_derator");
    await comment(A, threads.otherPublished, "Try the flea market on Saturday");
    await as(MOD, "select public.mark_all_notifications_read()");
    const unread = await sql<{ recipient_id: string }>("select recipient_id from public.notifications where read_at is null order by recipient_id");
    assert.deepEqual(unread.map((r) => r.recipient_id).sort(), [ids.a, ids.b].sort());
    await assert.rejects(as(anon, "select * from public.notifications"), /permission denied/);
    await assert.rejects(as(anon, "select public.mark_all_notifications_read()"), /permission denied for function/);
  });
});

describe("announcements", () => {
  const post = async (actor: Actor, title = "Eid dinner on Saturday", body = "Join us at **7 pm** in the Mensa.") =>
    (await as<{ id: number; author_id: string }>(
      actor,
      "insert into public.announcements (title, body) values ($1, $2) returning id, author_id",
      [title, body],
    ))[0];
  const announcementNotes = () =>
    sql<{ recipient_id: string; actor_id: string | null; announcement_id: number; thread_id: number | null }>(
      "select recipient_id, actor_id, announcement_id, thread_id from public.notifications where type = 'announcement' order by recipient_id",
    );

  test("anyone reads announcements, including anon", async () => {
    const { id } = await post(MOD);
    assert.deepEqual((await as<{ id: number }>(anon, "select id from public.announcements")).map((r) => r.id), [id]);
    assert.equal((await as(A, "select id from public.announcements")).length, 1);
  });

  test("members and anon cannot post, edit or delete announcements", async () => {
    await assert.rejects(post(A), /row-level security/);
    await assert.rejects(post(anon), /permission denied/);
    const { id } = await post(MOD);
    assert.equal((await as(A, "update public.announcements set title = 'Hacked title' where id = $1 returning id", [id])).length, 0);
    assert.equal((await as(A, "update public.announcements set is_pinned = true where id = $1 returning id", [id])).length, 0);
    assert.equal((await as(A, "delete from public.announcements where id = $1 returning id", [id])).length, 0);
    await assert.rejects(as(anon, "delete from public.announcements where id = $1", [id]), /permission denied/);
    assert.equal((await sql("select 1 from public.announcements where id = $1 and title = 'Eid dinner on Saturday'", [id])).length, 1);
  });

  test("moderators and the superadmin create, edit, pin and delete; author and timestamps stay theirs", async () => {
    const { id, author_id } = await post(MOD);
    assert.equal(author_id, ids.mod);
    await assert.rejects(
      as(MOD, "insert into public.announcements (title, body, author_id) values ('Fake author', 'x', $1)", [ids.a]),
      /permission denied/,
    );
    await assert.rejects(as(MOD, "update public.announcements set created_at = now() where id = $1", [id]), /permission denied/);
    await assert.rejects(post(MOD, "Hi"), /check constraint/);
    await assert.rejects(post(MOD, "Long body", "x".repeat(10001)), /check constraint/);
    await assert.rejects(post(MOD, "Blank body", "  \n "), /check constraint/);
    await assert.rejects(as(MOD, "update public.announcements set author_id = $2 where id = $1", [id, ids.a]), /permission denied/);
    await assert.rejects(as(MOD, "update public.announcements set updated_at = now() where id = $1", [id]), /permission denied/);

    await sql("update public.announcements set updated_at = now() - interval '1 day' where id = $1", [id]);
    await as(ADMIN, "update public.announcements set is_pinned = true where id = $1", [id]);
    const [pinned] = await sql<{ is_pinned: boolean; edited: boolean }>(
      "select is_pinned, updated_at < now() as edited from public.announcements where id = $1",
      [id],
    );
    assert.deepEqual(pinned, { is_pinned: true, edited: true });
    await as(MOD, "update public.announcements set body = 'Moved to 8 pm' where id = $1", [id]);
    const [edited] = await sql<{ fresh: boolean }>("select updated_at = now() as fresh from public.announcements where id = $1", [id]);
    assert.equal(edited.fresh, true);

    assert.equal((await as(ADMIN, "delete from public.announcements where id = $1 returning id", [id])).length, 1);
  });

  test("a new announcement notifies everyone but its author, once; recipients read only their own", async () => {
    const { id } = await post(MOD);
    assert.deepEqual(
      await announcementNotes(),
      [ids.a, ids.b, ids.admin].sort().map((recipient) => ({ recipient_id: recipient, actor_id: ids.mod, announcement_id: id, thread_id: null })),
    );
    await as(MOD, "update public.announcements set title = 'Eid dinner moved to Sunday', is_pinned = true where id = $1", [id]);
    assert.equal((await announcementNotes()).length, 3);
    const visible = await as<{ recipient_id: string; type: string }>(A, "select recipient_id, type::text as type from public.notifications where announcement_id = $1", [id]);
    assert.deepEqual(visible, [{ recipient_id: ids.a, type: "announcement" }]);
  });

  test("deleting an announcement deletes its notifications; deleting the author keeps it", async () => {
    const { id } = await post(MOD);
    await as(MOD, "delete from public.announcements where id = $1", [id]);
    assert.deepEqual(await announcementNotes(), []);

    const { id: kept } = await post(MOD);
    await sql("delete from auth.users where id = $1", [ids.mod]);
    const [row] = await sql<{ author_id: string | null }>("select author_id from public.announcements where id = $1", [kept]);
    assert.equal(row.author_id, null);
    assert.equal((await announcementNotes()).length, 3);
  });
});

describe("comment votes", () => {
  // The statement supabase-js sends for upsert({ comment_id, value }, { onConflict: "comment_id,user_id" }).
  const vote = (actor: Actor, comment: number, value: number) =>
    as(
      actor,
      `insert into public.comment_votes (comment_id, value) values ($1, $2)
       on conflict (comment_id, user_id) do update set comment_id = excluded.comment_id, value = excluded.value`,
      [comment, value],
    );
  const unvote = (actor: Actor, comment: number) =>
    as(actor, "delete from public.comment_votes where comment_id = $1", [comment]);
  const score = async (comment: number) =>
    (await sql<{ score: number }>("select score from public.comments where id = $1", [comment]))[0].score;

  test("members vote, change and withdraw their vote; the cached score follows", async () => {
    assert.equal(await score(comments.visible), 0);
    await vote(A, comments.visible, 1);
    await vote(MOD, comments.visible, 1);
    assert.equal(await score(comments.visible), 2);
    await vote(A, comments.visible, -1);
    assert.equal(await score(comments.visible), 0);
    await vote(A, comments.visible, -1);
    assert.equal(await score(comments.visible), 0);
    await unvote(MOD, comments.visible);
    assert.equal(await score(comments.visible), -1);
    await unvote(A, comments.visible);
    assert.equal(await score(comments.visible), 0);
    assert.deepEqual(await sql("select * from public.comment_votes"), []);
    await assert.rejects(vote(A, comments.visible, 0), /comment_votes_value_check/);
    await assert.rejects(vote(A, comments.visible, 2), /comment_votes_value_check/);
  });

  test("self-votes are rejected", async () => {
    await assert.rejects(vote(B, comments.visible, 1), /you cannot vote on your own comment/);
    await assert.rejects(vote(A, comments.onOther, -1), /you cannot vote on your own comment/);
    assert.equal(await score(comments.visible), 0);
  });

  test("row level security alone rejects self-votes and votes on hidden comments", async () => {
    await sql("alter table public.comment_votes disable trigger comment_votes_guard");
    await assert.rejects(vote(B, comments.visible, 1), /row-level security/);
    await assert.rejects(vote(MOD, comments.hidden, 1), /row-level security/);
    await vote(A, comments.visible, 1);
    await sql("update public.comments set hidden_at = now() where id = $1", [comments.visible]);
    await assert.rejects(vote(A, comments.visible, -1), /row-level security/);
  });

  test("hidden comments and pending threads take no votes; archived threads freeze theirs", async () => {
    await assert.rejects(vote(B, comments.hidden, 1), /voting is only possible on visible comments of published threads/);
    await assert.rejects(vote(MOD, comments.hidden, 1), /voting is only possible on visible comments of published threads/);

    await vote(B, comments.onOther, 1);
    await sql("update public.threads set status = 'archived' where id = $1", [threads.otherPublished]);
    await assert.rejects(vote(MOD, comments.onOther, 1), /voting is only possible/);
    await assert.rejects(vote(B, comments.onOther, -1), /voting is only possible/);
    await assert.rejects(unvote(B, comments.onOther), /voting is only possible/);
    assert.equal(await score(comments.onOther), 1);

    await sql("update public.threads set status = 'pending' where id = $1", [threads.otherPublished]);
    await assert.rejects(vote(MOD, comments.onOther, 1), /voting is only possible/);
    await assert.rejects(vote(B, comments.onOther, 1), /voting is only possible/);
  });

  test("voters read only their own votes; scores are public; anon reads and writes nothing", async () => {
    await vote(A, comments.visible, 1);
    await vote(MOD, comments.visible, -1);
    await vote(B, comments.onOther, 1);
    assert.deepEqual(
      await as(A, "select comment_id, user_id, value from public.comment_votes"),
      [{ comment_id: comments.visible, user_id: ids.a, value: 1 }],
    );
    assert.equal((await as(ADMIN, "select 1 from public.comment_votes")).length, 0);
    assert.equal((await as(MOD, "select 1 from public.comment_votes where user_id <> $1", [ids.mod])).length, 0);
    await assert.rejects(as(anon, "select * from public.comment_votes"), /permission denied/);
    await assert.rejects(vote(anon, comments.visible, 1), /permission denied/);
    await assert.rejects(unvote(anon, comments.visible), /permission denied/);
    const scores = await as<{ id: number; score: number }>(anon, "select id, score from public.comments where id = any($1::bigint[]) order by id", [[comments.visible, comments.onOther]]);
    assert.deepEqual(scores, [{ id: comments.visible, score: 0 }, { id: comments.onOther, score: 1 }]);
  });

  test("clients cannot write the score or someone else's vote, not even with a widened grant", async () => {
    await vote(B, comments.onOther, 1);
    await assert.rejects(as(A, "update public.comments set score = 100 where id = $1", [comments.onOther]), /permission denied/);
    await assert.rejects(as(A, "insert into public.comments (thread_id, body, score) values ($1, 'Hi', 5)", [threads.published]), /permission denied/);
    await assert.rejects(as(A, "insert into public.comment_votes (comment_id, user_id, value) values ($1, $2, 1)", [comments.visible, ids.mod]), /permission denied/);
    assert.equal((await as(A, "update public.comment_votes set value = -1 where comment_id = $1 returning 1", [comments.onOther])).length, 0);
    assert.equal((await as(A, "delete from public.comment_votes where comment_id = $1 returning 1", [comments.onOther])).length, 0);
    await assert.rejects(
      as(B, "update public.comment_votes set comment_id = $1 where comment_id = $2", [comments.visible, comments.onOther]),
      /a vote cannot be moved to another comment/,
    );

    await sql("grant update (score) on public.comments to authenticated");
    await assert.rejects(
      as(A, "update public.comments set score = 100 where id = $1", [comments.onOther]),
      /the score of a comment changes only through votes/,
    );
    await assert.rejects(
      as(MOD, "update public.comments set score = 100 where id = $1", [comments.visible]),
      /the score of a comment changes only through votes/,
    );
    assert.equal(await score(comments.onOther), 1);
  });

  test("deleting a voter's account takes their votes out of the scores; deleting a comment removes its votes", async () => {
    await vote(A, comments.visible, 1);
    await vote(MOD, comments.visible, 1);
    await vote(B, comments.onOther, -1);
    await vote(MOD, comments.onOther, -1);
    assert.deepEqual([await score(comments.visible), await score(comments.onOther)], [2, -2]);

    await as(MOD, "select public.delete_own_account()");
    assert.deepEqual([await score(comments.visible), await score(comments.onOther)], [1, -1]);
    assert.equal((await sql("select 1 from public.comment_votes where user_id = $1", [ids.mod])).length, 0);

    await sql("delete from auth.users where id = $1", [ids.a]);
    assert.deepEqual([await score(comments.visible), await score(comments.onOther)], [0, -1]);
    assert.deepEqual(await sql("select user_id from public.comment_votes"), [{ user_id: ids.b }]);

    await sql("delete from public.comments where id = $1", [comments.onOther]);
    assert.deepEqual(await sql("select 1 from public.comment_votes"), []);
  });

  test("votes notify nobody", async () => {
    const [{ count: before }] = await sql<{ count: number }>("select count(*)::int as count from public.notifications");
    await vote(A, comments.visible, 1);
    await vote(A, comments.visible, -1);
    await unvote(A, comments.visible);
    const [{ count: afterwards }] = await sql<{ count: number }>("select count(*)::int as count from public.notifications");
    assert.equal(afterwards, before);
  });
});

describe("handle backfill on an existing database", () => {
  const fresh = newDatabase();
  after(async () => {
    await fresh.close();
  });

  test("existing profiles get unique handles in sign-up order; notifications join the realtime publication", async () => {
    await fresh.exec(supabaseBootstrap);
    await fresh.exec("create publication supabase_realtime");
    const files = migrationFiles();
    const handlesMigration = "20261024100000_replies_mentions_notifications.sql";
    for (const file of files.filter((f) => f < handlesMigration)) await fresh.exec(migrationSql(file));

    const people = [
      ["first@example.com", "Ayesha Khan"],
      ["second@example.com", "ayesha khan"],
      ["third@example.com", "Admin"],
      ["fourth@example.com", "Mo"],
    ];
    const created: string[] = [];
    for (const [n, [email, name]] of people.entries()) {
      const { rows } = await fresh.query<{ id: string }>(
        "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id",
        [email, JSON.stringify({ full_name: name })],
      );
      await fresh.query("update public.profiles set created_at = now() - make_interval(days => $2) where id = $1", [rows[0].id, 10 - n]);
      created.push(rows[0].id);
    }

    for (const file of files.filter((f) => f >= handlesMigration)) await fresh.exec(migrationSql(file));

    const { rows } = await fresh.query<{ id: string; username: string }>("select id, username from public.profiles");
    const byId = Object.fromEntries(rows.map((r) => [r.id, r.username]));
    assert.deepEqual(created.map((id) => byId[id]), ["ayesha_khan", "ayesha_khan2", "admin2", "mo_user"]);
    const published = await fresh.query("select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notifications'");
    assert.equal(published.rows.length, 1);
  });
});
