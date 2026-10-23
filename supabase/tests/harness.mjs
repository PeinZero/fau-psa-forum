// Runs the real migrations in PGlite with Supabase's roles, default grants and auth.uid(),
// then acts as each persona via `set local role` + request.jwt.claims, like PostgREST does.
// Every test runs inside a transaction that is rolled back, so tests never see each other.
// Plain JS with JSDoc types: Node runs it directly and tsc reads the types without needing
// .ts import extensions.
import { after, afterEach, before, beforeEach } from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";

/** @typedef {{ role: "anon" | "authenticated"; sub?: string }} Actor */
/** @typedef {Record<string, unknown>} Row */

export const migrationsDir = join(import.meta.dirname, "..", "migrations");

export const supabaseBootstrap = `
  create role anon nologin noinherit;
  create role authenticated nologin noinherit;
  create role service_role nologin noinherit bypassrls;

  create schema extensions;
  grant usage on schema extensions to anon, authenticated, service_role;

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

/** A PGlite instance with the extensions hosted Supabase offers. */
export const newDatabase = () => new PGlite({ extensions: { pg_trgm } });

/** @returns {string[]} migration file names in apply order */
export const migrationFiles = () => readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

/** @param {string} file */
export const migrationSql = (file) => readFileSync(join(migrationsDir, file), "utf8");

export const db = newDatabase();
/** @type {Actor} */
export const anon = { role: "anon" };
export const ids = { a: "", b: "", mod: "", admin: "" };
/** @param {string} sub @returns {Actor} */
export const member = (sub) => ({ role: "authenticated", sub });
/** @type {Actor} */ export let A;
/** @type {Actor} */ export let B;
/** @type {Actor} */ export let MOD;
/** @type {Actor} */ export let ADMIN;
export const threads = { published: 0, pending: 0, rejected: 0, archived: 0, otherPublished: 0 };
export const comments = { visible: 0, hidden: 0, onOther: 0 };
export const categories = { courses: 0 };

/**
 * @template [T=Row]
 * @param {string} query
 * @param {unknown[]} [params]
 * @returns {Promise<T[]>}
 */
export async function sql(query, params = []) {
  return /** @type {T[]} */ ((await db.query(query, params)).rows);
}

/**
 * @template [T=Row]
 * @param {Actor} actor
 * @param {string} query
 * @param {unknown[]} [params]
 * @returns {Promise<T[]>}
 */
export async function as(actor, query, params = []) {
  await db.exec("savepoint act");
  try {
    await db.exec(`set local role ${actor.role}`);
    const claims = actor.sub ? { sub: actor.sub, role: actor.role } : { role: actor.role };
    await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
    const rows = await sql(query, params);
    await db.exec("reset role; release savepoint act");
    return /** @type {T[]} */ (rows);
  } catch (error) {
    await db.exec("rollback to savepoint act");
    throw error;
  }
}

/** @param {string} email @param {Row} [meta] @returns {Promise<string>} */
export async function createUser(email, meta = {}) {
  const [row] = await sql(
    "insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id",
    [email, JSON.stringify(meta)],
  );
  return /** @type {string} */ (row.id);
}

/**
 * @param {string} author @param {string} status @param {string} title @param {string} [body]
 * @param {Row} [extra] other thread columns, e.g. { category_id, city }
 * @returns {Promise<number>}
 */
export async function createThread(author, status, title, body = "Some body text", extra = {}) {
  const row0 = { title, body, category_id: categories.courses, author_id: author, ...extra };
  const columns = Object.keys(row0);
  const values = Object.values(row0);
  const [row] = await sql(
    `insert into public.threads (${columns.join(", ")}) values (${values.map((_, n) => `$${n + 1}`).join(", ")}) returning id`,
    values,
  );
  await sql("update public.threads set status = $1 where id = $2", [status, row.id]);
  return /** @type {number} */ (row.id);
}

/** @param {number} thread @param {string} author @param {string} body @returns {Promise<number>} */
export async function createComment(thread, author, body) {
  const [row] = await sql(
    "insert into public.comments (thread_id, author_id, body) values ($1, $2, $3) returning id",
    [thread, author, body],
  );
  return /** @type {number} */ (row.id);
}

/**
 * Registers the suite hooks: migrate and seed once, one rolled-back transaction per test.
 * Seed: members Ayesha (A) and Bilal (B), a moderator (MOD) and the superadmin (ADMIN), threads
 * in every status and a visible, a hidden and another comment.
 */
export function setupDatabase() {
  before(async () => {
    await db.exec(supabaseBootstrap);
    for (const file of migrationFiles()) await db.exec(migrationSql(file));

    ids.a = await createUser("ayesha@example.com", { full_name: "Ayesha Khan" });
    ids.b = await createUser("bilal@example.com", { name: "Bilal" });
    ids.mod = await createUser("mod@example.com", { full_name: "Mo Derator" });
    ids.admin = await createUser("owner@example.com", { full_name: "Owner" });
    await sql("update public.profiles set role = 'moderator' where id = $1", [ids.mod]);
    await sql("update public.profiles set role = 'superadmin' where id = $1", [ids.admin]);
    [A, B, MOD, ADMIN] = [member(ids.a), member(ids.b), member(ids.mod), member(ids.admin)];

    [{ id: categories.courses }] = await sql("select id from public.categories where slug = 'courses'");
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
}
