// Verified-on date and "needs update" requests: moderator-only verification, member requests
// with one open request per thread and a cap of five, decisions recorded by trigger.
import { beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import { A, ADMIN, B, MOD, anon, as, createThread, createUser, ids, setupDatabase, sql, threads } from "./harness.mjs";
import type { Actor } from "./harness.mjs";

setupDatabase();

const requestNote = (actor: Actor, thread: number, note: string | null = null) =>
  as<{ id: number }>(actor, "insert into public.update_requests (thread_id, note) values ($1, $2) returning id", [thread, note]);

const requestRows = (thread: number) =>
  sql<{ id: number; requester_id: string | null; status: string; resolved_by: string | null; resolved_at: Date | null }>(
    "select id, requester_id, status, resolved_by, resolved_at from public.update_requests where thread_id = $1 order by id",
    [thread],
  );

beforeEach(async () => {
  await sql("delete from public.notifications");
});

describe("mark_thread_verified", () => {
  for (const [name, actor, id] of [["moderator", () => MOD, () => ids.mod], ["superadmin", () => ADMIN, () => ids.admin]] as const) {
    test(`${name} stamps the verification date and verifier`, async () => {
      await as(actor(), "select public.mark_thread_verified($1)", [threads.published]);
      const [row] = await sql<{ verified: boolean; verified_by: string }>(
        "select last_verified_at is not null and last_verified_at <= now() as verified, verified_by from public.threads where id = $1",
        [threads.published],
      );
      assert.equal(row.verified, true);
      assert.equal(row.verified_by, id());
    });
  }

  test("members and anon cannot verify", async () => {
    await assert.rejects(as(A, "select public.mark_thread_verified($1)", [threads.published]), /only moderators can verify threads/);
    await assert.rejects(as(anon, "select public.mark_thread_verified($1)", [threads.published]), /permission denied for function/);
    const [row] = await sql("select last_verified_at from public.threads where id = $1", [threads.published]);
    assert.equal(row.last_verified_at, null);
  });

  test("unknown thread id is reported", async () => {
    await assert.rejects(as(MOD, "select public.mark_thread_verified(999999)"), /thread not found/);
  });

  test("members cannot write the verification columns directly", async () => {
    await assert.rejects(as(A, "update public.threads set last_verified_at = now() where id = $1", [threads.published]), /permission denied/);
    await assert.rejects(as(A, "update public.threads set verified_by = $2 where id = $1", [threads.published, ids.a]), /permission denied/);
  });
});

describe("verification after edits", () => {
  const verification = async () =>
    (await sql<{ last_verified_at: Date | null; verified_by: string | null }>(
      "select last_verified_at, verified_by from public.threads where id = $1",
      [threads.published],
    ))[0];
  const verifiedInSearch = async () =>
    (await as<{ id: number }>(anon, "select id from public.search_threads_v2('', p_verified => true)")).map((r) => r.id);

  for (const column of ["title", "body"]) {
    test(`an author's ${column} edit clears the verification`, async () => {
      await as(MOD, "select public.mark_thread_verified($1)", [threads.published]);
      assert.deepEqual(await verifiedInSearch(), [threads.published]);
      await as(A, `update public.threads set ${column} = 'Pay the fee to a new account' where id = $1`, [threads.published]);
      assert.deepEqual(await verification(), { last_verified_at: null, verified_by: null });
      assert.deepEqual(await verifiedInSearch(), []);
    });
  }

  test("a moderator moving the thread keeps the verification", async () => {
    await as(MOD, "select public.mark_thread_verified($1)", [threads.published]);
    await as(MOD, "update public.threads set city = 'nuremberg' where id = $1", [threads.published]);
    const row = await verification();
    assert.ok(row.last_verified_at);
    assert.equal(row.verified_by, ids.mod);
    assert.deepEqual(await verifiedInSearch(), [threads.published]);
  });

  test("a moderator editing their own thread keeps its verification", async () => {
    const own = await createThread(ids.mod, "published", "Where to renew the Deutschlandticket?");
    await as(MOD, "select public.mark_thread_verified($1)", [own]);
    await as(MOD, "update public.threads set body = 'At the VAG customer centre' where id = $1", [own]);
    const [row] = await sql<{ verified_by: string | null }>("select verified_by from public.threads where id = $1", [own]);
    assert.equal(row.verified_by, ids.mod);
  });

  test("an author's edit of other columns keeps the verification", async () => {
    await as(MOD, "select public.mark_thread_verified($1)", [threads.published]);
    await as(A, "update public.threads set city = 'nuremberg' where id = $1", [threads.published]);
    assert.equal((await verification()).verified_by, ids.mod);
  });
});

describe("requesting an update", () => {
  test("member request records the requester and starts open", async () => {
    await requestNote(B, threads.published, "Fees changed");
    const [row] = await sql<{ requester_id: string; status: string; note: string }>(
      "select requester_id, status, note from public.update_requests where thread_id = $1",
      [threads.published],
    );
    assert.deepEqual(row, { requester_id: ids.b, status: "open", note: "Fees changed" });
  });

  test("only published threads accept requests", async () => {
    for (const thread of [threads.pending, threads.archived, threads.rejected]) {
      await assert.rejects(requestNote(A, thread), /updates can only be requested for published threads/);
    }
    assert.equal((await sql("select 1 from public.update_requests")).length, 0);
  });

  test("a second open request on the same thread is refused, a new one works after a decision", async () => {
    await requestNote(B, threads.published);
    await assert.rejects(requestNote(B, threads.published), /you already asked for an update of this thread/);
    await as(MOD, "update public.update_requests set status = 'resolved' where thread_id = $1", [threads.published]);
    await requestNote(B, threads.published);
    assert.deepEqual((await requestRows(threads.published)).map((r) => r.status), ["resolved", "open"]);
  });

  test("different members may each have an open request on the same thread", async () => {
    await requestNote(A, threads.published);
    await requestNote(B, threads.published);
    assert.equal((await requestRows(threads.published)).length, 2);
  });

  test("a member holds at most five open requests", async () => {
    const extra: number[] = [];
    for (let n = 0; n < 5; n++) extra.push(await createThread(ids.a, "published", `Extra thread ${n}`));
    await requestNote(B, threads.published);
    for (const id of extra.slice(0, 4)) await requestNote(B, id);
    await assert.rejects(requestNote(B, extra[4]), /you already have 5 open update requests/);

    await as(MOD, "update public.update_requests set status = 'dismissed' where thread_id = $1", [threads.published]);
    await requestNote(B, extra[4]);
  });

  test("the note is limited to 300 characters", async () => {
    await assert.rejects(requestNote(B, threads.published, "x".repeat(301)), /check constraint/);
    await requestNote(B, threads.published, "x".repeat(300));
  });

  test("status, requester and resolver are not insertable", async () => {
    for (const column of ["status", "requester_id", "resolved_by"]) {
      const value = column === "status" ? "'resolved'" : `'${ids.a}'`;
      await assert.rejects(
        as(B, `insert into public.update_requests (thread_id, ${column}) values ($1, ${value})`, [threads.published]),
        /permission denied/,
      );
    }
  });

  test("anon can neither insert nor read", async () => {
    await assert.rejects(requestNote(anon, threads.published), /permission denied/);
    await assert.rejects(as(anon, "select * from public.update_requests"), /permission denied/);
  });
});

describe("update request visibility and decisions", () => {
  beforeEach(async () => {
    await requestNote(A, threads.published, "from A");
    await requestNote(B, threads.published, "from B");
  });

  test("members read only their own requests, moderators all", async () => {
    const notes = async (actor: Actor) =>
      (await as<{ note: string }>(actor, "select note from public.update_requests order by id")).map((r) => r.note);
    assert.deepEqual(await notes(A), ["from A"]);
    assert.deepEqual(await notes(B), ["from B"]);
    assert.deepEqual(await notes(MOD), ["from A", "from B"]);
    assert.deepEqual(await notes(ADMIN), ["from A", "from B"]);
  });

  test("members cannot decide their own request", async () => {
    const updated = await as(A, "update public.update_requests set status = 'resolved' where requester_id = $1 returning id", [ids.a]);
    assert.equal(updated.length, 0);
    const [row] = await sql("select status from public.update_requests where requester_id = $1", [ids.a]);
    assert.equal(row.status, "open");
  });

  test("moderator decisions record who and when, reopening clears them", async () => {
    for (const status of ["resolved", "dismissed"]) {
      await as(MOD, "update public.update_requests set status = $1 where requester_id = $2", [status, ids.a]);
      const [row] = await sql<{ status: string; resolved_by: string; resolved_at: Date }>(
        "select status, resolved_by, resolved_at from public.update_requests where requester_id = $1",
        [ids.a],
      );
      assert.equal(row.status, status);
      assert.equal(row.resolved_by, ids.mod);
      assert.ok(row.resolved_at);
    }
    await as(ADMIN, "update public.update_requests set status = 'resolved' where requester_id = $1", [ids.a]);
    assert.equal((await sql("select resolved_by from public.update_requests where requester_id = $1", [ids.a]))[0].resolved_by, ids.admin);

    await as(MOD, "update public.update_requests set status = 'open' where requester_id = $1", [ids.a]);
    const [reopened] = await sql("select status, resolved_by, resolved_at from public.update_requests where requester_id = $1", [ids.a]);
    assert.deepEqual(reopened, { status: "open", resolved_by: null, resolved_at: null });
  });

  test("moderators cannot rewrite other columns", async () => {
    await assert.rejects(as(MOD, "update public.update_requests set note = 'edited'"), /permission denied/);
  });
});

describe("update request notifications", () => {
  const recipients = async () =>
    sql<{ recipient_id: string; actor_id: string; thread_id: number; comment_id: number | null }>(
      "select recipient_id, actor_id, thread_id, comment_id from public.notifications where type = 'mod_new_update_request' order by recipient_id",
    );

  test("every moderator and superadmin except the requester is notified", async () => {
    await requestNote(B, threads.published);
    const rows = await recipients();
    assert.deepEqual(rows.map((r) => r.recipient_id).sort(), [ids.mod, ids.admin].sort());
    for (const row of rows) {
      assert.equal(row.actor_id, ids.b);
      assert.equal(row.thread_id, threads.published);
      assert.equal(row.comment_id, null);
    }
  });

  test("a moderator's own request notifies only the other staff member", async () => {
    await requestNote(MOD, threads.published);
    assert.deepEqual((await recipients()).map((r) => r.recipient_id), [ids.admin]);
  });
});

describe("update request cascades", () => {
  test("deleting the thread deletes its requests", async () => {
    await requestNote(B, threads.published);
    await sql("delete from public.threads where id = $1", [threads.published]);
    assert.equal((await sql("select 1 from public.update_requests")).length, 0);
  });

  test("deleting the requester keeps the request without a requester", async () => {
    const leaver = await createUser("leaver@example.com", { full_name: "Leaver" });
    await requestNote({ role: "authenticated", sub: leaver }, threads.published);
    await sql("delete from auth.users where id = $1", [leaver]);
    const rows = await requestRows(threads.published);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].requester_id, null);
  });
});
