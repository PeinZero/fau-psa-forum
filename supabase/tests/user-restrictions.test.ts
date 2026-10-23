// Mutes and bans: who may restrict whom, what the database blocks, expiry, lifting and the
// notifications the member receives.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { A, B, MOD, ADMIN, anon, as, categories, comments, createUser, ids, setupDatabase, sql, threads } from "./harness.mjs";

setupDatabase();

type Actor = typeof A;

async function restrict(actor: Actor, target: string, kind: "mute" | "ban", reason = "Posting spam", duration: string | null = null) {
  const [row] = await as<{ id: number }>(actor, "select public.restrict_user($1, $2, $3, $4::interval) as id", [target, kind, reason, duration]);
  return row.id;
}
const lift = (actor: Actor, id: number) => as(actor, "select public.lift_restriction($1)", [id]);

/** A restriction that started two days ago and ended yesterday. */
async function expired(target: string, kind: "mute" | "ban") {
  await sql(
    `insert into public.user_restrictions (user_id, kind, reason, created_at, expires_at)
     values ($1, $2, 'Old', now() - interval '2 days', now() - interval '1 day')`,
    [target, kind],
  );
}

const BANNED = /your account is banned: Harassment/;

const writes: [string, string, () => unknown[]][] = [
  ["comment", "insert into public.comments (thread_id, body) values ($1, 'hello')", () => [threads.published]],
  ["post a thread", "insert into public.threads (title, body, category_id) values ('A valid title here', 'Body', $1)", () => [categories.courses]],
  ["report", "insert into public.reports (comment_id, reason) values ($1, 'spam')", () => [comments.visible]],
  ["request an update", "insert into public.update_requests (thread_id) values ($1)", () => [threads.otherPublished]],
  ["vote", "insert into public.comment_votes (comment_id, value) values ($1, 1)", () => [comments.visible]],
  ["apply to moderate", "insert into public.moderator_applications (motivation) values ('I would like to help the community')", () => []],
];

const edits: [string, string, () => unknown[]][] = [
  ["edit their profile", "update public.profiles set display_name = 'New Name' where id = $1", () => [ids.a]],
  ["edit their thread", "update public.threads set body = 'Edited' where id = $1", () => [threads.published]],
  ["edit their comment", "update public.comments set body = 'Edited' where id = $1", () => [comments.onOther]],
];

describe("a muted member", () => {
  for (const [name, query, params] of writes) {
    test(`cannot ${name}`, async () => {
      await restrict(MOD, ids.a, "mute", "Posting spam", "7 days");
      await assert.rejects(as(A, query, params()), (error: Error & { code?: string }) => {
        assert.match(error.message, /^your account is muted until \d{1,2} [A-Z][a-z]{2} \d{4}, \d{2}:\d{2}: Posting spam$/);
        assert.equal(error.code, "P0001");
        return true;
      });
    });
  }

  test("a permanent mute names no end date", async () => {
    await restrict(MOD, ids.a, "mute");
    await assert.rejects(as(A, writes[0][1], writes[0][2]()), (error: Error) => {
      assert.equal(error.message, "your account is muted: Posting spam");
      return true;
    });
  });

  test("still reads, edits own content and marks announcements seen", async () => {
    await restrict(MOD, ids.a, "mute");
    assert.ok((await as(A, "select * from public.threads where status = 'published'")).length > 0);
    for (const [, query, params] of edits) await as(A, query, params());
    await as(A, "update public.profiles set announcements_seen_at = now() where id = $1", [ids.a]);
  });

  test("other members are unaffected", async () => {
    await restrict(MOD, ids.a, "mute");
    await as(B, "insert into public.comments (thread_id, body) values ($1, 'still fine')", [threads.published]);
  });

  test("posts again once the mute expires", async () => {
    await expired(ids.a, "mute");
    await as(A, "insert into public.comments (thread_id, body) values ($1, 'back again')", [threads.published]);
    const [{ active }] = await sql<{ active: boolean }>("select public.is_restricted($1, 'mute') as active", [ids.a]);
    assert.equal(active, false);
  });

  test("posts again once the mute is lifted", async () => {
    const id = await restrict(MOD, ids.a, "mute");
    await lift(MOD, id);
    await as(A, "insert into public.comments (thread_id, body) values ($1, 'back again')", [threads.published]);
  });
});

describe("a banned member", () => {
  for (const [name, query, params] of [...writes, ...edits]) {
    test(`cannot ${name}`, async () => {
      await restrict(ADMIN, ids.a, "ban", "Harassment");
      await assert.rejects(as(A, query, params()), BANNED);
    });
  }

  test("the ban message wins over a mute", async () => {
    await restrict(MOD, ids.a, "mute");
    await restrict(ADMIN, ids.a, "ban", "Harassment");
    await assert.rejects(as(A, writes[0][1], writes[0][2]()), BANNED);
  });

  test("still reads and manages notifications", async () => {
    await restrict(ADMIN, ids.a, "ban", "Harassment");
    assert.ok((await as(A, "select * from public.threads where status = 'published'")).length > 0);
    await as(A, "select public.mark_all_notifications_read()");
  });

  test("moderators still moderate a banned member's content", async () => {
    await restrict(ADMIN, ids.a, "ban", "Harassment");
    await as(MOD, "update public.threads set title = 'How do I extend my residence permit quickly?' where id = $1", [threads.published]);
    await as(MOD, "update public.comments set hidden_at = now() where id = $1", [comments.onOther]);
  });

  test("an expired ban blocks nothing", async () => {
    await expired(ids.a, "ban");
    await as(A, edits[0][1], edits[0][2]());
  });
});

describe("who may restrict whom", () => {
  test("moderators mute members, with an end date from the duration", async () => {
    const id = await restrict(MOD, ids.a, "mute", "  Posting spam  ", "1 day");
    const [row] = await sql<{ reason: string; created_by: string; kind: string; one_day: boolean }>(
      "select reason, created_by, kind, expires_at = created_at + interval '1 day' as one_day from public.user_restrictions where id = $1",
      [id],
    );
    assert.deepEqual(row, { reason: "Posting spam", created_by: ids.mod, kind: "mute", one_day: true });
  });

  test("only the superadmin bans", async () => {
    await assert.rejects(restrict(MOD, ids.a, "ban"), /only the superadmin can ban accounts/);
    await restrict(ADMIN, ids.a, "ban");
  });

  test("members and visitors restrict nobody", async () => {
    await assert.rejects(restrict(B, ids.a, "mute"), /only moderators can restrict accounts/);
    await assert.rejects(as(anon, "select public.restrict_user($1, 'mute', 'x')", [ids.a]), /permission denied/);
  });

  test("nobody restricts themselves or the superadmin", async () => {
    await assert.rejects(restrict(MOD, ids.mod, "mute"), /you cannot restrict yourself/);
    await assert.rejects(restrict(ADMIN, ids.admin, "ban"), /you cannot restrict yourself/);
    await assert.rejects(restrict(MOD, ids.admin, "mute"), /the superadmin cannot be restricted/);
    const second = await createUser("cofounder@example.com", { full_name: "Co Founder" });
    await sql("update public.profiles set role = 'superadmin' where id = $1", [second]);
    await assert.rejects(restrict(ADMIN, second, "ban"), /the superadmin cannot be restricted/);
  });

  test("moderators cannot restrict other moderators; the superadmin can", async () => {
    const other = await createUser("mod2@example.com", { full_name: "Second Mod" });
    await sql("update public.profiles set role = 'moderator' where id = $1", [other]);
    await assert.rejects(restrict(MOD, other, "mute"), /only the superadmin can restrict moderators/);
    const id = await restrict(ADMIN, other, "mute");
    await assert.rejects(lift(MOD, id), /only the superadmin can restrict moderators/);
    await lift(ADMIN, id);
  });

  test("a reason is required and durations must be positive", async () => {
    await assert.rejects(restrict(MOD, ids.a, "mute", "   "), /a reason is required/);
    await assert.rejects(restrict(MOD, ids.a, "mute", "Spam", "-1 day"), /the duration must be positive/);
    await assert.rejects(restrict(MOD, ids.a, "mute", "x".repeat(501)), /check constraint/);
    await assert.rejects(restrict(MOD, "00000000-0000-0000-0000-000000000000", "mute"), /user not found/);
  });

  test("one active restriction per kind; an expired one does not count", async () => {
    await restrict(MOD, ids.a, "mute");
    await assert.rejects(restrict(MOD, ids.a, "mute"), /this user is already muted/);
    await expired(ids.b, "mute");
    await restrict(MOD, ids.b, "mute");
  });

  test("only the superadmin lifts a ban; ended restrictions cannot be lifted", async () => {
    const ban = await restrict(ADMIN, ids.a, "ban");
    await assert.rejects(lift(MOD, ban), /only the superadmin can lift a ban/);
    await lift(ADMIN, ban);
    await assert.rejects(lift(ADMIN, ban), /this restriction was already lifted/);
    await expired(ids.b, "mute");
    const [{ id }] = await sql<{ id: number }>("select id from public.user_restrictions where user_id = $1", [ids.b]);
    await assert.rejects(lift(MOD, id), /this restriction has already ended/);
    await assert.rejects(lift(B, id), /only moderators can lift restrictions/);
  });

  test("lifting records who lifted it and when", async () => {
    const id = await restrict(MOD, ids.a, "mute");
    await lift(MOD, id);
    const [row] = await sql<{ lifted_by: string; lifted: boolean }>(
      "select lifted_by, lifted_at is not null as lifted from public.user_restrictions where id = $1",
      [id],
    );
    assert.deepEqual(row, { lifted_by: ids.mod, lifted: true });
  });
});

describe("reading restrictions", () => {
  test("members read only their own, moderators all", async () => {
    await restrict(MOD, ids.a, "mute");
    await restrict(MOD, ids.b, "mute");
    assert.equal((await as(MOD, "select * from public.user_restrictions")).length, 2);
    const own = await as<{ user_id: string; reason: string }>(A, "select user_id, reason from public.user_restrictions");
    assert.deepEqual(own, [{ user_id: ids.a, reason: "Posting spam" }]);
    await assert.rejects(as(anon, "select * from public.user_restrictions"), /permission denied/);
  });

  test("nobody writes the table directly", async () => {
    for (const actor of [A, MOD, ADMIN]) {
      await assert.rejects(
        as(actor, "insert into public.user_restrictions (user_id, kind, reason) values ($1, 'mute', 'x')", [ids.b]),
        /permission denied/,
      );
    }
    const id = await restrict(MOD, ids.a, "mute");
    await assert.rejects(as(A, "update public.user_restrictions set lifted_at = now() where id = $1", [id]), /permission denied/);
    await assert.rejects(as(MOD, "delete from public.user_restrictions where id = $1", [id]), /permission denied/);
  });

  test("restrictions disappear with the account", async () => {
    const [{ id: user }] = await sql<{ id: string }>("insert into auth.users (email) values ('gone@example.com') returning id");
    await restrict(MOD, user, "mute");
    await sql("delete from auth.users where id = $1", [user]);
    assert.equal((await sql("select * from public.user_restrictions where user_id = $1", [user])).length, 0);
  });
});

describe("notifications", () => {
  type Note = { type: string; actor_id: string; restriction_id: number };
  const notes = (actor: Actor) =>
    as<Note>(
      actor,
      "select type, actor_id, restriction_id from public.notifications where type::text like 'account_%' order by id",
    );

  test("the member hears about a mute, a ban and the lift, linked to the restriction", async () => {
    const mute = await restrict(MOD, ids.a, "mute", "Spam", "1 day");
    const ban = await restrict(ADMIN, ids.a, "ban", "Harassment");
    await lift(ADMIN, ban);
    assert.deepEqual(await notes(A), [
      { type: "account_muted", actor_id: ids.mod, restriction_id: mute },
      { type: "account_banned", actor_id: ids.admin, restriction_id: ban },
      { type: "account_unrestricted", actor_id: ids.admin, restriction_id: ban },
    ]);
    assert.equal((await notes(MOD)).length, 0);
  });

  test("the notification can show the reason and end date", async () => {
    await restrict(MOD, ids.a, "mute", "Spam", "1 day");
    const [row] = await as<{ restriction: { reason: string; kind: string } }>(
      A,
      `select json_build_object('reason', r.reason, 'kind', r.kind) as restriction
       from public.notifications n join public.user_restrictions r on r.id = n.restriction_id`,
    );
    assert.deepEqual(row.restriction, { reason: "Spam", kind: "mute" });
  });
});
