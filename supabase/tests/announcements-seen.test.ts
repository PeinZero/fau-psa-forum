// Unseen-announcements badge: each member may move their own announcements_seen_at, nothing else.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { A, anon, as, ids, setupDatabase, sql } from "./harness.mjs";

setupDatabase();

const seenAt = async (user: string) =>
  (await sql<{ announcements_seen_at: string | null }>("select announcements_seen_at from public.profiles where id = $1", [user]))[0]
    .announcements_seen_at;

describe("announcements_seen_at", () => {
  test("profiles start with a timestamp so old announcements are not unseen", async () => {
    assert.notEqual(await seenAt(ids.a), null);
  });

  test("a member can update their own value", async () => {
    await as(A, "update public.profiles set announcements_seen_at = '2030-01-01T00:00:00Z' where id = $1", [ids.a]);
    assert.equal(new Date((await seenAt(ids.a)) as string).toISOString(), "2030-01-01T00:00:00.000Z");
  });

  test("a member cannot update someone else's value", async () => {
    const before = await seenAt(ids.b);
    const rows = await as(A, "update public.profiles set announcements_seen_at = now() + interval '1 day' where id = $1 returning id", [ids.b]);
    assert.deepEqual(rows, []);
    assert.deepEqual(await seenAt(ids.b), before);
  });

  test("anonymous visitors cannot update it", async () => {
    await assert.rejects(as(anon, "update public.profiles set announcements_seen_at = now() where id = $1", [ids.a]), /permission denied/);
  });

  test("the own-row grant does not open other protected columns", async () => {
    await assert.rejects(as(A, "update public.profiles set role = 'moderator' where id = $1", [ids.a]), /permission denied/);
    await assert.rejects(as(A, "update public.profiles set created_at = now() where id = $1", [ids.a]), /permission denied/);
    await assert.rejects(as(A, "update public.profiles set reputation = 9 where id = $1", [ids.a]), /permission denied/);
  });
});
