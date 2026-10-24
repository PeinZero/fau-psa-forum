// Moderation log and canned replies: every moderator decision is logged by the database with
// actor, target and reason; only moderators read the log and nobody writes it from a client.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { A, ADMIN, B, MOD, anon, as, comments, ids, setupDatabase, sql, threads } from "./harness.mjs";

setupDatabase();

type LogRow = {
  actor_id: string | null;
  action: string;
  thread_id: number | null;
  comment_id: number | null;
  target_user_id: string | null;
  reason: string | null;
  details: Record<string, unknown> | null;
};

const log = () =>
  sql<LogRow>(
    "select actor_id, action, thread_id, comment_id, target_user_id, reason, details from public.moderation_log order by id",
  );

async function only(): Promise<LogRow> {
  const rows = await log();
  assert.equal(rows.length, 1, `expected one log row, got ${rows.map((r) => r.action).join(", ")}`);
  return rows[0];
}

describe("thread decisions", () => {
  test("approving a pending thread names the moderator, the thread and its author", async () => {
    await as(MOD, "update public.threads set status = 'published' where id = $1", [threads.pending]);
    assert.deepEqual(await only(), {
      actor_id: ids.mod,
      action: "thread_approved",
      thread_id: threads.pending,
      comment_id: null,
      target_user_id: ids.a,
      reason: null,
      details: { title: "Pending question from Ayesha" },
    });
  });

  test("a rejection keeps its reason", async () => {
    await as(MOD, "update public.threads set status = 'rejected', rejection_reason = 'Duplicate' where id = $1", [threads.pending]);
    const row = await only();
    assert.equal(row.action, "thread_rejected");
    assert.equal(row.reason, "Duplicate");
  });

  const cases: [string, string, string, () => number][] = [
    ["archive", "status = 'archived'", "thread_archived", () => threads.published],
    ["unarchive", "status = 'published'", "thread_unarchived", () => threads.archived],
    ["pin", "is_pinned = true", "thread_pinned", () => threads.published],
    ["outdated", "is_outdated = true", "thread_outdated", () => threads.published],
  ];
  for (const [name, set, action, thread] of cases) {
    test(`${name} is logged as ${action}`, async () => {
      await as(ADMIN, `update public.threads set ${set} where id = $1`, [thread()]);
      const row = await only();
      assert.equal(row.action, action);
      assert.equal(row.actor_id, ids.admin);
      assert.equal(row.thread_id, thread());
    });
  }

  test("unpinning and clearing the outdated flag are logged too", async () => {
    await sql("update public.threads set is_pinned = true, is_outdated = true where id = $1", [threads.published]);
    await as(MOD, "update public.threads set is_pinned = false, is_outdated = false where id = $1", [threads.published]);
    const rows = await log();
    assert.deepEqual(rows.map((r) => r.action), ["thread_unpinned", "thread_outdated"]);
    assert.equal(rows[1].details?.outdated, false);
  });

  test("verifying a thread is logged", async () => {
    await as(MOD, "select public.mark_thread_verified($1)", [threads.published]);
    assert.equal((await only()).action, "thread_verified");
  });

  test("setting and unsetting the best answer name the comment and its author", async () => {
    await as(MOD, "update public.threads set best_comment_id = $1 where id = $2", [comments.visible, threads.published]);
    await as(MOD, "update public.threads set best_comment_id = null where id = $1", [threads.published]);
    const rows = await log();
    assert.deepEqual(
      rows.map((r) => [r.action, r.comment_id, r.target_user_id]),
      [
        ["best_answer_set", comments.visible, ids.b],
        ["best_answer_unset", comments.visible, ids.b],
      ],
    );
  });

  test("members editing their own thread and seed data create no entries", async () => {
    await as(A, "update public.threads set title = 'How do I extend my residence permit quickly?' where id = $1", [threads.published]);
    await sql("update public.threads set status = 'archived' where id = $1", [threads.otherPublished]);
    assert.equal((await log()).length, 0);
  });
});

describe("comments, reports, requests and reviews", () => {
  test("hiding and unhiding a comment", async () => {
    await as(MOD, "update public.comments set hidden_at = now() where id = $1", [comments.visible]);
    await as(MOD, "update public.comments set hidden_at = null where id = $1", [comments.visible]);
    const rows = await log();
    assert.deepEqual(rows.map((r) => r.action), ["comment_hidden", "comment_unhidden"]);
    assert.equal(rows[0].thread_id, threads.published);
    assert.equal(rows[0].comment_id, comments.visible);
    assert.equal(rows[0].target_user_id, ids.b);
  });

  test("resolving and dismissing reports point at the reported content and its author", async () => {
    const [{ id: onComment }] = await as<{ id: number }>(
      A, "insert into public.reports (comment_id, reason) values ($1, 'spam') returning id", [comments.visible],
    );
    const [{ id: onThread }] = await as<{ id: number }>(
      A, "insert into public.reports (thread_id, reason) values ($1, 'wrong_info') returning id", [threads.otherPublished],
    );
    await as(MOD, "update public.reports set status = 'resolved' where id = $1", [onComment]);
    await as(MOD, "update public.reports set status = 'dismissed' where id = $1", [onThread]);
    const rows = await log();
    assert.deepEqual(
      rows.map((r) => [r.action, r.thread_id, r.comment_id, r.target_user_id, r.details?.report_reason]),
      [
        ["report_resolved", threads.published, comments.visible, ids.b, "spam"],
        ["report_dismissed", threads.otherPublished, null, ids.b, "wrong_info"],
      ],
    );
  });

  test("resolving and dismissing update requests", async () => {
    const [{ id: first }] = await as<{ id: number }>(A, "insert into public.update_requests (thread_id) values ($1) returning id", [threads.otherPublished]);
    const [{ id: second }] = await as<{ id: number }>(B, "insert into public.update_requests (thread_id) values ($1) returning id", [threads.otherPublished]);
    await as(MOD, "update public.update_requests set status = 'resolved' where id = $1", [first]);
    await as(MOD, "update public.update_requests set status = 'dismissed' where id = $1", [second]);
    assert.deepEqual((await log()).map((r) => r.action), ["update_request_resolved", "update_request_dismissed"]);
  });

  test("reviewing a revision", async () => {
    await as(A, "update public.threads set title = 'How do I extend my residence permit quickly?' where id = $1", [threads.published]);
    await as(MOD, "update public.thread_revisions set reviewed_at = now() where thread_id = $1", [threads.published]);
    const row = await only();
    assert.equal(row.action, "revision_reviewed");
    assert.equal(row.thread_id, threads.published);
    assert.equal(row.target_user_id, ids.a);
  });
});

describe("people, categories, announcements and guides", () => {
  test("approving an application is one entry, though it also promotes the applicant", async () => {
    const [{ id }] = await as<{ id: number }>(
      B, "insert into public.moderator_applications (motivation) values ('I answer visa questions every week') returning id",
    );
    await as(MOD, "select public.review_moderator_application($1, 'approved')", [id]);
    const row = await only();
    assert.equal(row.action, "application_approved");
    assert.equal(row.target_user_id, ids.b);
  });

  test("rejecting an application", async () => {
    const [{ id }] = await as<{ id: number }>(
      B, "insert into public.moderator_applications (motivation) values ('I answer visa questions every week') returning id",
    );
    await as(MOD, "select public.review_moderator_application($1, 'rejected')", [id]);
    assert.equal((await only()).action, "application_rejected");
  });

  test("a role change records the old and new role", async () => {
    await as(ADMIN, "select public.set_user_role($1, 'moderator')", [ids.b]);
    const row = await only();
    assert.equal(row.action, "role_changed");
    assert.deepEqual(row.details, { from: "member", to: "moderator" });
  });

  test("creating, renaming and deleting a category", async () => {
    const [{ id }] = await as<{ id: number }>(MOD, "insert into public.categories (slug, name) values ('sports', 'Sports') returning id");
    await as(MOD, "update public.categories set name = 'Sports & Clubs' where id = $1", [id]);
    await as(MOD, "update public.categories set name = 'Sports & Clubs' where id = $1", [id]);
    await as(ADMIN, "delete from public.categories where id = $1", [id]);
    const rows = await log();
    assert.deepEqual(rows.map((r) => [r.action, r.details?.name]), [
      ["category_created", "Sports"],
      ["category_updated", "Sports & Clubs"],
      ["category_deleted", "Sports & Clubs"],
    ]);
  });

  test("posting and deleting an announcement keeps its title", async () => {
    const [{ id }] = await as<{ id: number }>(MOD, "insert into public.announcements (title, body) values ('Iftar on Friday', 'Join us') returning id");
    await as(MOD, "delete from public.announcements where id = $1", [id]);
    assert.deepEqual((await log()).map((r) => [r.action, r.details?.title]), [
      ["announcement_created", "Iftar on Friday"],
      ["announcement_deleted", "Iftar on Friday"],
    ]);
  });

  test("creating and deleting a guide", async () => {
    const [{ id }] = await as<{ id: number }>(MOD, "insert into public.guides (slug, title) values ('arrival', 'Arriving in Erlangen') returning id");
    await as(MOD, "delete from public.guides where id = $1", [id]);
    assert.deepEqual((await log()).map((r) => r.action), ["guide_created", "guide_deleted"]);
  });

  test("muting, banning and lifting are logged with the reason", async () => {
    const [{ restrict_user: mute }] = await as<{ restrict_user: number }>(
      MOD, "select public.restrict_user($1, 'mute', 'Spam links', '7 days')", [ids.a],
    );
    await as(ADMIN, "select public.restrict_user($1, 'ban', 'Harassment')", [ids.b]);
    await as(MOD, "select public.lift_restriction($1)", [mute]);
    const rows = await log();
    assert.deepEqual(rows.map((r) => [r.action, r.actor_id, r.target_user_id, r.reason]), [
      ["user_muted", ids.mod, ids.a, "Spam links"],
      ["user_banned", ids.admin, ids.b, "Harassment"],
      ["user_unrestricted", ids.mod, ids.a, null],
    ]);
    assert.equal(rows[0].details?.restriction_id, mute);
  });

  test("entries survive the deletion of their thread, with the title kept", async () => {
    await as(MOD, "update public.threads set status = 'published' where id = $1", [threads.pending]);
    await sql("delete from public.threads where id = $1", [threads.pending]);
    const row = await only();
    assert.equal(row.thread_id, null);
    assert.equal(row.details?.title, "Pending question from Ayesha");
  });
});

describe("who reads and writes the log", () => {
  test("moderators and the superadmin read it, members and visitors do not", async () => {
    await as(MOD, "update public.threads set is_pinned = true where id = $1", [threads.published]);
    assert.equal((await as(MOD, "select * from public.moderation_log")).length, 1);
    assert.equal((await as(ADMIN, "select * from public.moderation_log")).length, 1);
    assert.equal((await as(A, "select * from public.moderation_log")).length, 0);
    await assert.rejects(as(anon, "select * from public.moderation_log"), /permission denied/);
  });

  test("nobody writes, edits or deletes entries from a client", async () => {
    await as(MOD, "update public.threads set is_pinned = true where id = $1", [threads.published]);
    for (const actor of [A, MOD, ADMIN]) {
      await assert.rejects(
        as(actor, "insert into public.moderation_log (actor_id, action) values ($1, 'thread_pinned')", [ids.mod]),
        /permission denied/,
      );
      await assert.rejects(as(actor, "update public.moderation_log set reason = 'x'"), /permission denied/);
      await assert.rejects(as(actor, "delete from public.moderation_log"), /permission denied/);
      await assert.rejects(
        as(actor, "select public.log_moderation('thread_pinned', null, null, null)"),
        /permission denied/,
      );
    }
    assert.equal((await log()).length, 1);
  });
});

describe("canned replies", () => {
  test("five replies are seeded, all within the limits", async () => {
    const rows = await as<{ label: string; body: string }>(MOD, "select label, body from public.canned_replies order by sort_order");
    assert.deepEqual(rows.map((r) => r.label), [
      "Already answered — link",
      "Not about student life in Erlangen/Nuremberg",
      "Missing details",
      "Personal data included",
      "Duplicate",
    ]);
    for (const row of rows) assert.ok(row.label.length <= 60 && row.body.length <= 1000);
  });

  test("moderators add, edit and delete them", async () => {
    const [{ id }] = await as<{ id: number }>(
      MOD, "insert into public.canned_replies (label, body, sort_order) values ('Wrong category', 'Please pick the right category.', 60) returning id",
    );
    assert.equal((await as(ADMIN, "update public.canned_replies set label = 'Wrong section' where id = $1 returning id", [id])).length, 1);
    assert.equal((await as(MOD, "delete from public.canned_replies where id = $1 returning id", [id])).length, 1);
  });

  test("members and visitors can neither read nor change them", async () => {
    assert.equal((await as(A, "select * from public.canned_replies")).length, 0);
    await assert.rejects(as(anon, "select * from public.canned_replies"), /permission denied/);
    await assert.rejects(
      as(A, "insert into public.canned_replies (label, body) values ('Mine', 'Body')"),
      /row-level security/,
    );
    assert.equal((await as(A, "update public.canned_replies set label = 'x' returning id")).length, 0);
    assert.equal((await as(A, "delete from public.canned_replies returning id")).length, 0);
    assert.equal((await sql("select * from public.canned_replies")).length, 5);
  });

  test("labels are at most 60 and bodies at most 1000 characters", async () => {
    await assert.rejects(
      as(MOD, "insert into public.canned_replies (label, body) values ($1, 'Body')", ["x".repeat(61)]),
      /check constraint/,
    );
    await assert.rejects(
      as(MOD, "insert into public.canned_replies (label, body) values ('Label', $1)", ["x".repeat(1001)]),
      /check constraint/,
    );
  });
});
