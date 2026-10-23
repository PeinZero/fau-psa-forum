// Notification preferences: owner-only RLS and central muting of notifications. The harness
// (Supabase roles, auth.uid(), personas, seed data, rolled-back transactions) is in harness.mjs.
import { beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { A, ADMIN, B, MOD, anon, as, ids, setupDatabase, sql, threads, comments } from "./harness.mjs";
import type { Actor } from "./harness.mjs";

setupDatabase();

// PGlite returns enum arrays as their text literal and expects the same on the way in.
const lit = (types: string[]) => `{${types.join(",")}}`;
const parse = (literal: string) => (literal === "{}" ? [] : literal.slice(1, -1).split(","));

type Prefs = { user_id: string; muted_types: string; email_frequency: string; updated_at: Date };

const mute = (user: string, types: string[]) =>
  sql(
    "insert into public.notification_preferences (user_id, muted_types) values ($1, $2::public.notification_type[]) " +
      "on conflict (user_id) do update set muted_types = excluded.muted_types",
    [user, lit(types)],
  );
const comment = async (actor: Actor, thread: number, body: string, parent: number | null = null) =>
  (await as<{ id: number }>(actor, "insert into public.comments (thread_id, parent_id, body) values ($1, $2, $3) returning id", [thread, parent, body]))[0].id;
const typesFor = async (user: string) =>
  (await sql<{ type: string }>("select type::text as type from public.notifications where recipient_id = $1 order by id", [user])).map((r) => r.type);

describe("notification_preferences table", () => {
  test("defaults: nothing muted, emails off, user_id is the caller", async () => {
    const [row] = await as<Prefs>(A, "insert into public.notification_preferences default values returning *");
    assert.equal(row.user_id, ids.a);
    assert.deepEqual(parse(row.muted_types), []);
    assert.equal(row.email_frequency, "off");
  });

  test("a member inserts their own row with muted types and a frequency", async () => {
    const [row] = await as<Prefs>(
      A,
      "insert into public.notification_preferences (muted_types, email_frequency) values ('{reply,mention}', 'daily') returning *",
    );
    assert.equal(row.user_id, ids.a);
    assert.deepEqual(parse(row.muted_types), ["reply", "mention"]);
    assert.equal(row.email_frequency, "daily");
  });

  test("members read only their own row", async () => {
    await as(A, "insert into public.notification_preferences (email_frequency) values ('instant')");
    assert.equal((await as(A, "select * from public.notification_preferences")).length, 1);
    assert.equal((await as(B, "select * from public.notification_preferences")).length, 0);
    assert.equal((await as(MOD, "select * from public.notification_preferences")).length, 0);
  });

  test("updating bumps updated_at", async () => {
    await as(A, "insert into public.notification_preferences (email_frequency) values ('off')");
    await sql("update public.notification_preferences set updated_at = '2020-01-01' where user_id = $1", [ids.a]);
    const [row] = await as<Prefs>(A, "update public.notification_preferences set email_frequency = 'daily' where user_id = $1 returning *", [ids.a]);
    assert.equal(row.email_frequency, "daily");
    assert.ok(row.updated_at > new Date("2021-01-01"));
  });

  test("members cannot insert or move a row for another user", async () => {
    await assert.rejects(
      as(A, "insert into public.notification_preferences (user_id, muted_types) values ($1, '{reply}')", [ids.b]),
      /row-level security/,
    );
    await as(A, "insert into public.notification_preferences (email_frequency) values ('off')");
    await assert.rejects(as(A, "update public.notification_preferences set user_id = $1", [ids.b]), /row-level security/);
  });

  test("members cannot update another user's row", async () => {
    await as(B, "insert into public.notification_preferences (email_frequency) values ('off')");
    const rows = await as(A, "update public.notification_preferences set email_frequency = 'instant' where user_id = $1 returning user_id", [ids.b]);
    assert.equal(rows.length, 0);
    const [row] = await sql<Prefs>("select * from public.notification_preferences where user_id = $1", [ids.b]);
    assert.equal(row.email_frequency, "off");
  });

  test("the client upsert works, with or without user_id", async () => {
    const upsert =
      "insert into public.notification_preferences (muted_types, email_frequency) values ($1::public.notification_type[], $2) " +
      "on conflict (user_id) do update set muted_types = excluded.muted_types, email_frequency = excluded.email_frequency";
    await as(A, upsert, [lit(["reply"]), "daily"]);
    await as(A, upsert, [lit(["mention", "announcement"]), "instant"]);
    const rows = await sql<Prefs>("select * from public.notification_preferences where user_id = $1", [ids.a]);
    assert.equal(rows.length, 1);
    assert.deepEqual(parse(rows[0].muted_types), ["mention", "announcement"]);
    assert.equal(rows[0].email_frequency, "instant");

    const withId =
      "insert into public.notification_preferences (user_id, muted_types, email_frequency) values ($3, $1::public.notification_type[], $2) " +
      "on conflict (user_id) do update set muted_types = excluded.muted_types, email_frequency = excluded.email_frequency";
    await as(A, withId, [lit([]), "off", ids.a]);
    await as(B, withId, [lit(["reply"]), "daily", ids.b]);
    const [after] = await sql<Prefs>("select * from public.notification_preferences where user_id = $1", [ids.a]);
    assert.deepEqual(parse(after.muted_types), []);
    assert.equal(after.email_frequency, "off");
    await assert.rejects(as(A, withId, [lit([]), "off", ids.b]), /row-level security/);
  });

  test("anon is denied, members cannot delete", async () => {
    await assert.rejects(as(anon, "select * from public.notification_preferences"), /permission denied/);
    await assert.rejects(as(anon, "insert into public.notification_preferences (email_frequency) values ('off')"), /permission denied/);
    await as(A, "insert into public.notification_preferences (email_frequency) values ('off')");
    await assert.rejects(as(A, "delete from public.notification_preferences"), /permission denied/);
  });

  test("email_frequency accepts only off, instant and daily", async () => {
    await assert.rejects(
      as(A, "insert into public.notification_preferences (email_frequency) values ('weekly')"),
      /check constraint|violates/,
    );
  });
});

describe("muting skips notifications centrally", () => {
  beforeEach(async () => {
    await sql("delete from public.notifications");
  });

  test("muted thread_comment drops the new-comment notice; the author's own follow remains", async () => {
    await mute(ids.a, ["thread_comment"]);
    await comment(B, threads.published, "Book the appointment online");
    assert.deepEqual(await typesFor(ids.a), ["followed_thread_activity"]);
    await sql("delete from public.thread_follows where user_id = $1 and thread_id = $2", [ids.a, threads.published]);
    await sql("delete from public.notifications");
    await comment(B, threads.published, "And bring a passport photo");
    assert.deepEqual(await typesFor(ids.a), []);
  });

  test("muting announcement skips only that user", async () => {
    await mute(ids.a, ["announcement"]);
    await as(MOD, "insert into public.announcements (title, body) values ('Welcome event', 'Join us on Friday')");
    assert.deepEqual(await typesFor(ids.a), []);
    assert.deepEqual(await typesFor(ids.b), ["announcement"]);
  });

  test("muting mod_new_report skips that moderator, not the others", async () => {
    await mute(ids.admin, ["mod_new_report"]);
    await as(B, "insert into public.reports (thread_id, reason) values ($1, 'spam')", [threads.published]);
    assert.deepEqual(await typesFor(ids.admin), []);
    assert.deepEqual(await typesFor(ids.mod), ["mod_new_report"]);
  });

  test("muting best_answer skips the best-answer notice", async () => {
    await mute(ids.b, ["best_answer"]);
    await as(MOD, "update public.threads set best_comment_id = $2 where id = $1", [threads.published, comments.visible]);
    assert.ok(!(await typesFor(ids.b)).includes("best_answer"));
    await sql("delete from public.notification_preferences");
    await as(MOD, "update public.threads set best_comment_id = null where id = $1", [threads.published]);
    await as(MOD, "update public.threads set best_comment_id = $2 where id = $1", [threads.published, comments.visible]);
    assert.ok((await typesFor(ids.b)).includes("best_answer"));
  });

  test("muted reply falls back to thread_comment, one notification only", async () => {
    const own = await comment(A, threads.published, "Update from me");
    await sql("delete from public.notifications");
    await mute(ids.a, ["reply"]);
    await comment(B, threads.published, "Helpful, thanks", own);
    assert.deepEqual(await typesFor(ids.a), ["thread_comment"]);
  });

  test("muted mention falls back to followed_thread_activity for followers, else nothing", async () => {
    await mute(ids.b, ["mention"]);
    await comment(A, threads.published, "@bilal what do you think?");
    assert.deepEqual(await typesFor(ids.b), ["followed_thread_activity"]);
    await sql("delete from public.thread_follows where user_id = $1 and thread_id = $2", [ids.b, threads.published]);
    await sql("delete from public.notifications");
    await comment(A, threads.published, "@bilal again");
    assert.deepEqual(await typesFor(ids.b), []);
  });

  test("muting every type gives nothing", async () => {
    const all = (await sql<{ t: string }>("select unnest(enum_range(null::public.notification_type))::text as t")).map((r) => r.t);
    await mute(ids.a, all);
    await comment(B, threads.published, "@ayesha_khan see this");
    await as(MOD, "insert into public.announcements (title, body) values ('Welcome event', 'Join us')");
    assert.deepEqual(await typesFor(ids.a), []);
  });

  test("unmuting restores notifications", async () => {
    await mute(ids.a, ["thread_comment", "followed_thread_activity"]);
    await comment(B, threads.published, "First answer");
    assert.deepEqual(await typesFor(ids.a), []);
    await as(A, "update public.notification_preferences set muted_types = '{}'");
    await comment(B, threads.published, "Second answer");
    assert.deepEqual(await typesFor(ids.a), ["thread_comment"]);
  });

  test("clients can neither call the helper nor insert notifications", async () => {
    await assert.rejects(as(A, "select public.notification_muted($1, 'reply')", [ids.b]), /permission denied for function/);
    await assert.rejects(
      as(A, "insert into public.notifications (recipient_id, type) values ($1, 'announcement')", [ids.b]),
      /permission denied/,
    );
  });
});
