// Guides: moderator-curated checklists, public to read, with private per-member progress.
import { beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { A, ADMIN, B, MOD, anon, as, ids, setupDatabase, sql, threads } from "./harness.mjs";

setupDatabase();

type Guide = { id: number; slug: string; title: string; summary: string; created_by: string | null; updated_at: Date };

const newGuide = async (slug = "arriving-in-erlangen", title = "Arriving in Erlangen") =>
  (await sql<{ id: number }>("insert into public.guides (slug, title) values ($1, $2) returning id", [slug, title]))[0].id;
const newStep = async (guide: number, position: number, title = "Register your address") =>
  (await sql<{ id: number }>("insert into public.guide_steps (guide_id, position, title) values ($1, $2, $3) returning id", [guide, position, title]))[0].id;
const stale = (guide: number) => sql("update public.guides set updated_at = '2020-01-01' where id = $1", [guide]);
const updatedAt = async (guide: number) =>
  (await sql<{ updated_at: Date }>("select updated_at from public.guides where id = $1", [guide]))[0].updated_at;

describe("guides", () => {
  test("anon and members read guides and steps", async () => {
    const guide = await newGuide();
    await newStep(guide, 1);
    for (const actor of [anon, A]) {
      assert.equal((await as(actor, "select * from public.guides")).length, 1);
      assert.equal((await as(actor, "select * from public.guide_steps")).length, 1);
    }
  });

  test("members cannot create, edit or delete guides", async () => {
    const guide = await newGuide();
    await assert.rejects(as(A, "insert into public.guides (slug, title) values ('new-guide', 'New guide')"), /row-level security/);
    assert.equal((await as(A, "update public.guides set title = 'Hijacked guide' where id = $1 returning id", [guide])).length, 0);
    assert.equal((await as(A, "delete from public.guides where id = $1 returning id", [guide])).length, 0);
    assert.equal((await sql<Guide>("select * from public.guides"))[0].title, "Arriving in Erlangen");
  });

  test("anon writes are denied", async () => {
    const guide = await newGuide();
    await assert.rejects(as(anon, "insert into public.guides (slug, title) values ('new-guide', 'New guide')"), /permission denied/);
    await assert.rejects(as(anon, "update public.guides set title = 'Hijacked guide' where id = $1", [guide]), /permission denied/);
    await assert.rejects(as(anon, "delete from public.guides where id = $1", [guide]), /permission denied/);
  });

  test("moderators and superadmins create guides owned by themselves", async () => {
    for (const [actor, id] of [[MOD, ids.mod], [ADMIN, ids.admin]] as const) {
      const [row] = await as<Guide>(actor, "insert into public.guides (slug, title) values ($1, 'Student life guide') returning *", [`guide-${id.slice(0, 4)}`]);
      assert.equal(row.created_by, id);
      assert.equal(row.summary, "");
    }
  });

  test("created_by cannot be set by the client", async () => {
    await assert.rejects(
      as(MOD, "insert into public.guides (slug, title, created_by) values ('new-guide', 'New guide', $1)", [ids.b]),
      /permission denied/,
    );
  });

  test("moderators edit guides and updated_at is bumped", async () => {
    const guide = await newGuide();
    await stale(guide);
    const rows = await as(MOD, "update public.guides set title = 'Arriving in Germany', summary = 'Start here' where id = $1 returning id", [guide]);
    assert.equal(rows.length, 1);
    assert.ok((await updatedAt(guide)) > new Date("2021-01-01"));
  });

  test("deleting a guide removes its steps and everyone's progress", async () => {
    const guide = await newGuide();
    const step = await newStep(guide, 1);
    await sql("insert into public.guide_progress (user_id, step_id) values ($1, $2), ($3, $2)", [ids.a, step, ids.b]);
    assert.equal((await as(MOD, "delete from public.guides where id = $1 returning id", [guide])).length, 1);
    assert.equal((await sql("select 1 from public.guide_steps")).length, 0);
    assert.equal((await sql("select 1 from public.guide_progress")).length, 0);
  });

  test("slugs are lowercase kebab-case and unique", async () => {
    await assert.rejects(as(MOD, "insert into public.guides (slug, title) values ('Bad Slug', 'Valid title')"), /check constraint|violates/);
    await assert.rejects(as(MOD, "insert into public.guides (slug, title) values ('trailing-', 'Valid title')"), /check constraint|violates/);
    await as(MOD, "insert into public.guides (slug, title) values ('good-slug-2', 'Valid title')");
    await assert.rejects(as(MOD, "insert into public.guides (slug, title) values ('good-slug-2', 'Other title')"), /duplicate key|unique/);
  });

  test("title is 4 to 120 characters and the summary at most 300", async () => {
    await assert.rejects(as(MOD, "insert into public.guides (slug, title) values ('short-title', 'abc')"), /check constraint|violates/);
    await as(MOD, "insert into public.guides (slug, title) values ('ok-title', 'abcd')");
    await assert.rejects(as(MOD, "insert into public.guides (slug, title) values ('long-title', $1)", ["x".repeat(121)]), /check constraint|violates/);
    await assert.rejects(
      as(MOD, "insert into public.guides (slug, title, summary) values ('long-summary', 'Valid title', $1)", ["x".repeat(301)]),
      /check constraint|violates/,
    );
    await as(MOD, "insert into public.guides (slug, title, summary) values ('max-summary', 'Valid title', $1)", ["x".repeat(300)]);
  });
});

describe("guide_steps", () => {
  test("moderators create steps with an optional thread and nullable body", async () => {
    const guide = await newGuide();
    const [plain] = await as<{ body: string | null; thread_id: number | null }>(
      MOD,
      "insert into public.guide_steps (guide_id, position, title) values ($1, 1, 'Anmeldung') returning body, thread_id",
      [guide],
    );
    assert.equal(plain.body, null);
    assert.equal(plain.thread_id, null);
    const [linked] = await as<{ thread_id: number }>(
      MOD,
      "insert into public.guide_steps (guide_id, position, title, body, thread_id) values ($1, 2, 'Bank account', 'Bring your passport', $2) returning thread_id",
      [guide, threads.published],
    );
    assert.equal(linked.thread_id, threads.published);
  });

  test("position is unique per guide, not globally", async () => {
    const guide = await newGuide();
    const other = await newGuide("student-life", "Student life");
    await newStep(guide, 1);
    await assert.rejects(as(MOD, "insert into public.guide_steps (guide_id, position, title) values ($1, 1, 'Duplicate')", [guide]), /duplicate key|unique/);
    await as(MOD, "insert into public.guide_steps (guide_id, position, title) values ($1, 1, 'Same position')", [other]);
  });

  test("title is 2 to 120 characters and the body at most 5000", async () => {
    const guide = await newGuide();
    await assert.rejects(as(MOD, "insert into public.guide_steps (guide_id, position, title) values ($1, 1, 'x')", [guide]), /check constraint|violates/);
    await assert.rejects(as(MOD, "insert into public.guide_steps (guide_id, position, title) values ($1, 1, $2)", [guide, "x".repeat(121)]), /check constraint|violates/);
    await assert.rejects(
      as(MOD, "insert into public.guide_steps (guide_id, position, title, body) values ($1, 1, 'Valid step', $2)", [guide, "x".repeat(5001)]),
      /check constraint|violates/,
    );
    await as(MOD, "insert into public.guide_steps (guide_id, position, title, body) values ($1, 1, 'ok', $2)", [guide, "x".repeat(5000)]);
  });

  test("editing, adding or removing a step bumps the guide's updated_at", async () => {
    const guide = await newGuide();
    const step = await newStep(guide, 1);
    const bumped = async (change: () => Promise<unknown>) => {
      await stale(guide);
      await change();
      assert.ok((await updatedAt(guide)) > new Date("2021-01-01"));
    };
    await bumped(() => as(MOD, "update public.guide_steps set title = 'Renamed step' where id = $1", [step]));
    await bumped(() => as(MOD, "insert into public.guide_steps (guide_id, position, title) values ($1, 2, 'Second step')", [guide]));
    await bumped(() => as(MOD, "delete from public.guide_steps where id = $1", [step]));
  });

  test("deleting the linked thread keeps the step and clears thread_id", async () => {
    const guide = await newGuide();
    const [{ id }] = await sql<{ id: number }>(
      "insert into public.guide_steps (guide_id, position, title, thread_id) values ($1, 1, 'Linked step', $2) returning id",
      [guide, threads.otherPublished],
    );
    await sql("delete from public.threads where id = $1", [threads.otherPublished]);
    const [row] = await sql<{ thread_id: number | null }>("select thread_id from public.guide_steps where id = $1", [id]);
    assert.equal(row.thread_id, null);
  });

  test("members and anon cannot write steps", async () => {
    const guide = await newGuide();
    const step = await newStep(guide, 1);
    await assert.rejects(as(A, "insert into public.guide_steps (guide_id, position, title) values ($1, 2, 'Sneaky step')", [guide]), /row-level security/);
    assert.equal((await as(A, "update public.guide_steps set title = 'Hijacked' where id = $1 returning id", [step])).length, 0);
    assert.equal((await as(A, "delete from public.guide_steps where id = $1 returning id", [step])).length, 0);
    await assert.rejects(as(anon, "insert into public.guide_steps (guide_id, position, title) values ($1, 2, 'Sneaky step')", [guide]), /permission denied/);
  });
});

describe("guide_progress", () => {
  let step: number;
  beforeEach(async () => {
    step = await newStep(await newGuide(), 1);
  });

  test("a member ticks a step for themselves", async () => {
    const [row] = await as<{ user_id: string; completed_at: Date | null }>(A, "insert into public.guide_progress (step_id) values ($1) returning *", [step]);
    assert.equal(row.user_id, ids.a);
    assert.ok(row.completed_at);
  });

  test("progress is private, even from moderators", async () => {
    await as(A, "insert into public.guide_progress (step_id) values ($1)", [step]);
    assert.equal((await as(A, "select * from public.guide_progress")).length, 1);
    for (const actor of [B, MOD, ADMIN]) assert.equal((await as(actor, "select * from public.guide_progress")).length, 0);
  });

  test("members untick only their own steps", async () => {
    await sql("insert into public.guide_progress (user_id, step_id) values ($1, $3), ($2, $3)", [ids.a, ids.b, step]);
    assert.equal((await as(A, "delete from public.guide_progress returning user_id")).length, 1);
    assert.equal((await sql("select 1 from public.guide_progress where user_id = $1", [ids.b])).length, 1);
    assert.equal((await as(MOD, "delete from public.guide_progress returning user_id")).length, 0);
  });

  test("progress cannot be written for another user or updated", async () => {
    await assert.rejects(as(A, "insert into public.guide_progress (user_id, step_id) values ($1, $2)", [ids.b, step]), /permission denied/);
    await as(A, "insert into public.guide_progress (step_id) values ($1)", [step]);
    await assert.rejects(as(A, "update public.guide_progress set completed_at = now()"), /permission denied/);
  });

  test("anon cannot read or tick progress", async () => {
    await assert.rejects(as(anon, "select * from public.guide_progress"), /permission denied/);
    await assert.rejects(as(anon, "insert into public.guide_progress (step_id) values ($1)", [step]), /permission denied/);
  });

  test("ticking twice violates the primary key unless on conflict do nothing", async () => {
    await as(A, "insert into public.guide_progress (step_id) values ($1)", [step]);
    await assert.rejects(as(A, "insert into public.guide_progress (step_id) values ($1)", [step]), /duplicate key|unique/);
    await as(A, "insert into public.guide_progress (step_id) values ($1) on conflict do nothing", [step]);
    assert.equal((await sql("select 1 from public.guide_progress")).length, 1);
  });

  test("deleting a step or a user removes their progress", async () => {
    const other = await newStep((await sql<{ guide_id: number }>("select guide_id from public.guide_steps where id = $1", [step]))[0].guide_id, 2);
    await sql("insert into public.guide_progress (user_id, step_id) values ($1, $2), ($1, $3), ($4, $3)", [ids.a, step, other, ids.b]);
    await sql("delete from public.guide_steps where id = $1", [step]);
    assert.equal((await sql("select 1 from public.guide_progress")).length, 2);
    await sql("delete from auth.users where id = $1", [ids.a]);
    assert.equal((await sql("select user_id from public.guide_progress")).length, 1);
  });
});
