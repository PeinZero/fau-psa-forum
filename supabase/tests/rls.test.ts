// Runs the real migrations in PGlite with Supabase's roles, default grants and auth.uid(),
// then acts as each persona via `set local role` + request.jwt.claims, like PostgREST does.
import { after, afterEach, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";

const migrationsDir = join(import.meta.dirname, "..", "migrations");

const supabaseBootstrap = `
  create role anon nologin noinherit;
  create role authenticated nologin noinherit;
  create role service_role nologin noinherit bypassrls;

  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  );
  create function auth.uid() returns uuid language sql stable as $$
    select coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid
  $$;
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(
      nullif(current_setting('request.jwt.claim', true), ''),
      nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
  $$;
  create function auth.role() returns text language sql stable as $$
    select coalesce(
      nullif(current_setting('request.jwt.claim.role', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
    )::text
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on all functions in schema auth to anon, authenticated, service_role;

  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

type Actor = { role: "anon" | "authenticated"; sub?: string };
type Row = Record<string, unknown>;

const db = new PGlite();
const anon: Actor = { role: "anon" };
const ids = { a: "", b: "", mod: "", admin: "" };
const member = (sub: string): Actor => ({ role: "authenticated", sub });
let A: Actor, B: Actor, MOD: Actor, ADMIN: Actor;
const threads = { published: 0, pending: 0, rejected: 0, archived: 0, otherPublished: 0 };
const comments = { visible: 0, hidden: 0, onOther: 0 };
let coursesId = 0;

async function sql<T = Row>(query: string, params: unknown[] = []): Promise<T[]> {
  return (await db.query<T>(query, params)).rows;
}

async function as<T = Row>(actor: Actor, query: string, params: unknown[] = []): Promise<T[]> {
  await db.exec("savepoint act");
  try {
    await db.exec(`set local role ${actor.role}`);
    const claims = actor.sub ? { sub: actor.sub, role: actor.role } : { role: actor.role };
    await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    const rows = await sql<T>(query, params);
    await db.exec("reset role; release savepoint act");
    return rows;
  } catch (error) {
    await db.exec("rollback to savepoint act");
    throw error;
  }
}

async function createUser(email: string, meta: Row = {}): Promise<string> {
  const [row] = await sql<{ id: string }>(
    "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id",
    [email, JSON.stringify(meta)],
  );
  return row.id;
}

async function createThread(author: string, status: string, title: string, body = "Some body text"): Promise<number> {
  const [row] = await sql<{ id: number }>(
    `insert into public.threads (title, body, category_id, author_id) values ($1, $2, $3, $4) returning id`,
    [title, body, coursesId, author],
  );
  await sql("update public.threads set status = $1 where id = $2", [status, row.id]);
  return row.id;
}

async function createComment(thread: number, author: string, body: string): Promise<number> {
  const [row] = await sql<{ id: number }>(
    "insert into public.comments (thread_id, author_id, body) values ($1, $2, $3) returning id",
    [thread, author, body],
  );
  return row.id;
}

const threadIds = async (actor: Actor) =>
  (await as<{ id: number }>(actor, "select id from public.threads order by id")).map((r) => r.id);
const commentIds = async (actor: Actor) =>
  (await as<{ id: number }>(actor, "select id from public.comments order by id")).map((r) => r.id);

before(async () => {
  await db.exec(supabaseBootstrap);
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) await db.exec(readFileSync(join(migrationsDir, file), "utf8"));

  ids.a = await createUser("ayesha@example.com", { full_name: "Ayesha Khan" });
  ids.b = await createUser("bilal@example.com", { name: "Bilal" });
  ids.mod = await createUser("mod@example.com", { full_name: "Mo Derator" });
  ids.admin = await createUser("owner@example.com", { full_name: "Owner" });
  await sql("update public.profiles set role = 'moderator' where id = $1", [ids.mod]);
  await sql("update public.profiles set role = 'superadmin' where id = $1", [ids.admin]);
  [A, B, MOD, ADMIN] = [member(ids.a), member(ids.b), member(ids.mod), member(ids.admin)];

  [{ id: coursesId }] = await sql<{ id: number }>("select id from public.categories where slug = 'courses'");
  threads.published = await createThread(ids.a, "published", "How do I extend my residence permit?", "Bring your Anmeldung");
  threads.pending = await createThread(ids.a, "pending", "Pending question from Ayesha");
  threads.rejected = await createThread(ids.a, "rejected", "Rejected question from Ayesha");
  await sql("update public.threads set rejection_reason = 'Duplicate' where id = $1", [threads.rejected]);
  threads.archived = await createThread(ids.b, "archived", "Old semester ticket information", "Semesterticket details");
  threads.otherPublished = await createThread(ids.b, "published", "Where to buy a bicycle in Erlangen?");
  comments.visible = await createComment(threads.published, ids.b, "The Ausländerbehörde needs a Sperrkonto statement");
  comments.hidden = await createComment(threads.published, ids.a, "Spam about cryptocurrency giveaway");
  await sql("update public.comments set hidden_at = now(), hidden_by = $1 where id = $2", [ids.mod, comments.hidden]);
  comments.onOther = await createComment(threads.otherPublished, ids.a, "Try the flea market");
});

after(async () => {
  await db.close();
});

beforeEach(async () => {
  await db.exec("begin");
});

afterEach(async () => {
  await db.exec("rollback");
});

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
      [coursesId],
    );
    assert.equal(row.status, "pending");
    assert.equal(row.author_id, ids.b);
    assert.match(row.slug, /^anmeldung-in-n-rnberg-[0-9a-f]{6}$/);
  });

  test("anon cannot submit threads", async () => {
    await assert.rejects(
      as(anon, "insert into public.threads (title, body, category_id) values ('Anonymous question', 'x', $1)", [coursesId]),
      /permission denied/,
    );
  });

  test("members cannot submit as published or pinned, or on behalf of someone else", async () => {
    await assert.rejects(
      as(B, "insert into public.threads (title, body, category_id, status) values ('Sneaky published', 'x', $1, 'published')", [coursesId]),
      /permission denied/,
    );
    await assert.rejects(
      as(B, "insert into public.threads (title, body, category_id, is_pinned) values ('Sneaky pinned one', 'x', $1, true)", [coursesId]),
      /permission denied/,
    );
    await assert.rejects(
      as(B, "insert into public.threads (title, body, category_id, author_id) values ('Impersonation', 'x', $1, $2)", [coursesId, ids.a]),
      /permission denied/,
    );
  });

  test("a 4th pending thread is rejected for members but not for moderators", async () => {
    const submit = (actor: Actor, n: number) =>
      as(actor, "insert into public.threads (title, body, category_id) values ($1, 'body', $2)", [`Question number ${n}`, coursesId]);
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
    assert.equal((await as(A, "update public.categories set name = 'Hacked' where id = $1 returning id", [coursesId])).length, 0);
  });

  test("only the superadmin deletes categories, and only empty ones", async () => {
    const [{ id }] = await sql<{ id: number }>("select id from public.categories where slug = 'other'");
    assert.equal((await as(MOD, "delete from public.categories where id = $1 returning id", [id])).length, 0);
    assert.equal((await as(ADMIN, "delete from public.categories where id = $1 returning id", [id])).length, 1);
    await assert.rejects(as(ADMIN, "delete from public.categories where id = $1", [coursesId]), /foreign key/);
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
});
