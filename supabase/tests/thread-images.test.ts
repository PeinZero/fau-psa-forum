// Thread images: who reads them, only the author adds and removes them, the per-thread,
// per-member, site-wide and storage limits, the cleanup queue that keeps deleted images counting
// until their files are gone, image changes as reviewable revisions, check_image_upload()
// predicting the insert errors, and create_thread_with_images() posting a thread and its gallery
// in one transaction.
import { randomUUID } from "node:crypto";
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { A, ADMIN, B, MOD, anon, as, categories, createThread, ids, setupDatabase, sql, threads } from "./harness.mjs";
import type { Actor } from "./harness.mjs";

setupDatabase();

type Image = {
  key?: string;
  type?: "image/webp" | "image/jpeg" | string;
  width?: number;
  height?: number;
  size?: number;
  alt?: string | null;
};
type DbError = { message: string; code: string };
type Revision = { title: string; body: string; edited_by: string | null; image_keys: string[] | null };

const COLUMNS = "thread_id, storage_key, content_type, width, height, size_bytes, alt_text";
const COLUMN_COUNT = 7;
const newKey = (type = "image/webp") => `threads/${randomUUID()}.${type === "image/jpeg" ? "jpg" : "webp"}`;
const imageValues = (thread: number, image: Image = {}) => [
  thread,
  image.key ?? newKey(image.type),
  image.type ?? "image/webp",
  image.width ?? 1200,
  image.height ?? 900,
  image.size ?? 150_000,
  image.alt ?? null,
];

/** One statement, as PostgREST sends a multi-row insert. */
function addImages(actor: Actor, thread: number, images: Image[]) {
  const params = images.flatMap((image) => imageValues(thread, image));
  const rows = images.map(
    (_, row) => `(${Array.from({ length: COLUMN_COUNT }, (_, col) => `$${row * COLUMN_COUNT + col + 1}`).join(", ")})`,
  );
  return as<{ id: number }>(actor, `insert into public.thread_images (${COLUMNS}) values ${rows.join(", ")} returning id`, params);
}
const addImage = async (actor: Actor, thread: number, image: Image = {}) => (await addImages(actor, thread, [image]))[0].id;

/** Written past the client checks, like the service role, with the owner and age given. */
async function seedImage(thread: number, owner: string | null, image: Image = {}, age = "1 hour"): Promise<number> {
  const [row] = await sql<{ id: number }>(
    `insert into public.thread_images (${COLUMNS}, owner_id, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, now() - $9::interval) returning id`,
    [...imageValues(thread, image), owner, age],
  );
  return row.id;
}

/** `count` images of `owner` on fresh published threads of theirs, three per thread. */
async function seedGalleries(owner: string, count: number, age = "1 hour", size = 150_000) {
  const threadRows = await sql<{ id: number }>(
    `insert into public.threads (title, body, category_id, author_id, status)
     select 'Photos from the Bergkirchweih, part ' || g, 'Photos', $1, $2, 'published'
     from generate_series(1, $3::int) g returning id`,
    [categories.courses, owner, Math.ceil(count / 3)],
  );
  await sql(
    `insert into public.thread_images (${COLUMNS}, owner_id, created_at)
     select t.id, 'threads/' || gen_random_uuid() || '.webp', 'image/webp', 1200, 900, $4, null, $2, now() - $5::interval
     from unnest($1::bigint[]) as t(id) cross join generate_series(1, 3) as p
     order by t.id, p
     limit $3`,
    [threadRows.map((row) => row.id), owner, count, size, age],
  );
}

/** A published thread of `author`, for moderators, who change only their own galleries. */
const ownThread = (author: string) => createThread(author, "published", "Photos from the Erlangen Bergkirchweih");

const imageIds = async (actor: Actor) =>
  (await as<{ id: number }>(actor, "select id from public.thread_images order by id")).map((row) => row.id);
const galleryKeys = async (thread: number) =>
  (await sql<{ storage_key: string }>("select storage_key from public.thread_images where thread_id = $1 order by id", [thread])).map(
    (row) => row.storage_key,
  );
const removeImage = (actor: Actor, id: number) =>
  as<{ id: number }>(actor, "delete from public.thread_images where id = $1 returning id", [id]);
const removeImages = (actor: Actor, imageIdList: number[]) =>
  as<{ id: number }>(actor, "delete from public.thread_images where id = any($1::bigint[]) returning id", [imageIdList]);
const check = (actor: Actor, thread: number | null, count: number, bytes: number, removed?: (number | null)[] | null) =>
  removed === undefined
    ? as(actor, "select public.check_image_upload($1, $2, $3)", [thread, count, bytes])
    : as(actor, "select public.check_image_upload($1, $2, $3, $4::bigint[])", [thread, count, bytes, removed]);
const revisions = (thread: number) =>
  sql<Revision>("select title, body, edited_by, image_keys from public.thread_revisions where thread_id = $1 order by id", [thread]);
const editedNow = async (thread: number) =>
  (await sql<{ edited: boolean | null }>("select edited_at = now() as edited from public.threads where id = $1", [thread]))[0].edited;
/** What the nightly cleanup does once the files are gone. */
const runCleanup = () => sql("delete from public.media_deletions");

async function restrict(target: string, kind: "mute" | "ban") {
  await as(kind === "ban" ? ADMIN : MOD, "select public.restrict_user($1, $2, 'Posting spam')", [target, kind]);
}

async function errorOf(run: () => Promise<unknown>): Promise<DbError> {
  try {
    await run();
  } catch (error) {
    const { message, code } = error as Error & { code?: string };
    return { message, code: code ?? "" };
  }
  assert.fail("expected the database to raise");
}

/** check_image_upload() must raise exactly what the real insert raises. */
async function sameError(checkRun: () => Promise<unknown>, insertRun: () => Promise<unknown>, expected: RegExp) {
  const predicted = await errorOf(checkRun);
  const actual = await errorOf(insertRun);
  assert.deepEqual(predicted, actual);
  assert.match(actual.message, expected);
}

const NOT_YOURS = { message: "only the author can add images to a thread", code: "42501" };
const ARCHIVED = { message: "archived threads are read-only", code: "42501" };
const THREAD_FULL = { message: "a thread can have at most 3 images", code: "P0001" };
const REUSED_KEY = { message: "a deleted image cannot be added again", code: "23505" };
const MEMBER_DAILY = /^rate limit: You can add up to 6 images a day\. Please try again tomorrow\.$/;
const SITE_DAILY = /^rate limit: The forum has reached its daily limit for new images/;
const STORAGE_FULL = { message: "image storage is full", code: "P0001" };

describe("reading images", () => {
  test("anon sees images of published and archived threads only", async () => {
    const visible = [await seedImage(threads.published, ids.a), await seedImage(threads.archived, ids.b)];
    await seedImage(threads.pending, ids.a);
    await seedImage(threads.rejected, ids.a);
    assert.deepEqual(await imageIds(anon), visible);
  });

  test("members see their own pending and rejected galleries, not other members'", async () => {
    const published = await seedImage(threads.published, ids.a);
    const pending = await seedImage(threads.pending, ids.a);
    const rejected = await seedImage(threads.rejected, ids.a);
    assert.deepEqual(await imageIds(A), [published, pending, rejected]);
    assert.deepEqual(await imageIds(B), [published]);
  });

  test("moderators and the superadmin see every image", async () => {
    const all = [
      await seedImage(threads.published, ids.a),
      await seedImage(threads.pending, ids.a),
      await seedImage(threads.rejected, ids.a),
      await seedImage(threads.archived, ids.b),
    ];
    assert.deepEqual(await imageIds(MOD), all);
    assert.deepEqual(await imageIds(ADMIN), all);
  });

  test("an approved thread's images become public with it", async () => {
    const image = await seedImage(threads.pending, ids.a);
    assert.deepEqual(await imageIds(anon), []);
    await as(MOD, "update public.threads set status = 'published' where id = $1", [threads.pending]);
    assert.deepEqual(await imageIds(anon), [image]);
  });

  test("the gallery shows images in the order they were added", async () => {
    const keys = [newKey(), newKey("image/jpeg"), newKey()];
    await addImage(A, threads.published, { key: keys[0] });
    await addImages(A, threads.published, [{ key: keys[1], type: "image/jpeg" }, { key: keys[2] }]);
    const seen = await as<{ storage_key: string }>(anon, "select storage_key from public.thread_images where thread_id = $1 order by id", [
      threads.published,
    ]);
    assert.deepEqual(seen.map((row) => row.storage_key), keys);
  });
});

describe("adding images", () => {
  test("the author adds to their published thread as the owner, with trimmed alt text", async () => {
    const id = await addImage(A, threads.published, { alt: "  Queue at the Ausländerbehörde  " });
    const second = await addImage(A, threads.published, { alt: "   ", type: "image/jpeg" });
    const rows = await sql<{ owner_id: string; alt_text: string | null; recent: boolean }>(
      "select owner_id, alt_text, created_at > now() - interval '1 minute' as recent from public.thread_images where id = any($1::bigint[]) order by id",
      [[id, second]],
    );
    assert.deepEqual(rows, [
      { owner_id: ids.a, alt_text: "Queue at the Ausländerbehörde", recent: true },
      { owner_id: ids.a, alt_text: null, recent: true },
    ]);
  });

  test("the author adds to their pending and rejected threads", async () => {
    await addImage(A, threads.pending);
    await addImage(A, threads.rejected);
  });

  test("other members cannot add, whether or not they can read the thread", async () => {
    const [{ id: hiddenPending }] = await sql<{ id: number }>(
      "insert into public.threads (title, body, category_id, author_id) values ('Bilal asks about Mensa prices', 'Body', $1, $2) returning id",
      [categories.courses, ids.b],
    );
    for (const thread of [threads.published, threads.pending, hiddenPending, 999_999]) {
      const actor = thread === hiddenPending ? A : B;
      assert.deepEqual(await errorOf(() => addImage(actor, thread)), NOT_YOURS);
    }
    assert.equal((await sql("select 1 from public.thread_images")).length, 0);
  });

  test("moderators and the superadmin add to their own threads only", async () => {
    for (const thread of [threads.published, threads.pending, threads.rejected, threads.otherPublished]) {
      assert.deepEqual(await errorOf(() => addImage(MOD, thread)), NOT_YOURS);
      assert.deepEqual(await errorOf(() => addImage(ADMIN, thread)), NOT_YOURS);
    }
    const byMod = await addImage(MOD, await ownThread(ids.mod));
    const byAdmin = await addImage(ADMIN, await ownThread(ids.admin));
    const owners = await sql<{ owner_id: string }>("select owner_id from public.thread_images where id = any($1::bigint[]) order by id", [[byMod, byAdmin]]);
    assert.deepEqual(owners, [{ owner_id: ids.mod }, { owner_id: ids.admin }]);
  });

  test("archived threads take no new images, not even from their author", async () => {
    assert.deepEqual(await errorOf(() => addImage(B, threads.archived)), ARCHIVED);
    const archivedByMod = await createThread(ids.mod, "archived", "Old Mensa opening hours");
    assert.deepEqual(await errorOf(() => addImage(MOD, archivedByMod)), ARCHIVED);
    assert.deepEqual(await errorOf(() => addImage(ADMIN, threads.archived)), NOT_YOURS);
  });

  test("muted and banned members cannot add images", async () => {
    await restrict(ids.a, "mute");
    assert.deepEqual(await errorOf(() => addImage(A, threads.published)), { message: "your account is muted: Posting spam", code: "P0001" });
    await restrict(ids.b, "ban");
    assert.deepEqual(await errorOf(() => addImage(B, threads.otherPublished)), { message: "your account is banned: Posting spam", code: "P0001" });
  });

  test("nobody picks the owner or the upload time, not even with a widened grant", async () => {
    const spoof = (column: string, value: unknown) => () =>
      as(A, `insert into public.thread_images (${COLUMNS}, ${column}) values ($1, $2, $3, $4, $5, $6, $7, $8)`, [
        ...imageValues(threads.published),
        value,
      ]);
    assert.match((await errorOf(spoof("owner_id", ids.b))).message, /permission denied for table thread_images/);
    assert.match((await errorOf(spoof("created_at", "2020-01-01"))).message, /permission denied for table thread_images/);
    await sql("grant insert (owner_id) on public.thread_images to authenticated");
    assert.match((await errorOf(spoof("owner_id", ids.b))).message, /row-level security/);
  });

  test("anon cannot add images", async () => {
    assert.match((await errorOf(() => addImage(anon, threads.published))).message, /permission denied for table thread_images/);
  });

  test("images are immutable: nobody updates them", async () => {
    const id = await seedImage(threads.published, ids.a);
    for (const actor of [A, MOD]) {
      assert.match(
        (await errorOf(() => as(actor, "update public.thread_images set alt_text = 'New' where id = $1", [id]))).message,
        /permission denied for table thread_images/,
      );
    }
  });

  const invalid: [string, Image][] = [
    ["a key outside threads/", { key: `avatars/${randomUUID()}.webp` }],
    ["a key that is not a v4 uuid", { key: "threads/00000000-0000-0000-0000-000000000000.webp" }],
    ["a png", { key: `threads/${randomUUID()}.png`, type: "image/png" }],
    ["a webp type on a jpg key", { key: `threads/${randomUUID()}.jpg`, type: "image/webp" }],
    ["a jpeg type on a webp key", { key: `threads/${randomUUID()}.webp`, type: "image/jpeg" }],
    ["a width over 1600", { width: 1601 }],
    ["a zero height", { height: 0 }],
    ["more than 1 MB", { size: 1_000_001 }],
    ["an empty file", { size: 0 }],
    ["alt text over 200 characters", { alt: "x".repeat(201) }],
  ];
  for (const [name, image] of invalid) {
    test(`rejects ${name}`, async () => {
      assert.equal((await errorOf(() => addImage(A, threads.published, image))).code, "23514");
    });
  }

  test("accepts the largest allowed image and 200 characters of alt text", async () => {
    await addImage(A, threads.published, { width: 1600, height: 1600, size: 1_000_000, alt: "x".repeat(200), type: "image/jpeg" });
  });

  test("a storage key is used once", async () => {
    const key = newKey();
    await addImage(A, threads.published, { key });
    assert.equal((await errorOf(() => addImage(A, threads.published, { key }))).code, "23505");
    assert.equal((await errorOf(() => addImage(A, threads.otherPublished, { key }))).code, "42501");
    assert.equal((await errorOf(() => addImage(B, threads.otherPublished, { key }))).code, "23505");
  });
});

describe("removing images", () => {
  test("the author removes images of their thread, unlogged", async () => {
    const first = await seedImage(threads.published, ids.a);
    const second = await seedImage(threads.published, ids.a);
    assert.equal((await removeImage(A, first)).length, 1);
    assert.equal((await removeImage(A, second)).length, 1);
    assert.equal((await sql("select 1 from public.thread_images")).length, 0);
    assert.equal((await sql("select 1 from public.moderation_log")).length, 0);
  });

  test("other members, moderators and the superadmin remove nothing", async () => {
    const id = await seedImage(threads.pending, ids.a);
    for (const actor of [B, MOD, ADMIN]) {
      assert.equal((await removeImage(actor, id)).length, 0);
    }
    assert.equal((await sql("select 1 from public.thread_images where id = $1", [id])).length, 1);
    assert.equal((await sql("select 1 from public.media_deletions")).length, 0);
  });

  test("a moderator removes images of their own thread, unlogged", async () => {
    const id = await seedImage(await ownThread(ids.mod), ids.mod);
    assert.equal((await removeImage(MOD, id)).length, 1);
    assert.equal((await sql("select 1 from public.moderation_log")).length, 0);
  });

  test("anon cannot remove images", async () => {
    const id = await seedImage(threads.published, ids.a);
    assert.match((await errorOf(() => removeImage(anon, id))).message, /permission denied for table thread_images/);
  });

  test("archived galleries are frozen, even for their author", async () => {
    const id = await seedImage(threads.archived, ids.b);
    assert.deepEqual(await errorOf(() => removeImage(B, id)), ARCHIVED);
    assert.equal((await removeImage(MOD, id)).length, 0);
    assert.equal((await sql("select 1 from public.thread_images where id = $1", [id])).length, 1);
  });

  test("a muted author still removes images; a banned one cannot", async () => {
    const first = await seedImage(threads.published, ids.a);
    await restrict(ids.a, "mute");
    assert.equal((await removeImage(A, first)).length, 1);

    const second = await seedImage(threads.otherPublished, ids.b);
    await restrict(ids.b, "ban");
    assert.deepEqual(await errorOf(() => removeImage(B, second)), { message: "your account is banned: Posting spam", code: "P0001" });
  });

  test("deleting a thread takes its images along without logging them", async () => {
    await seedImage(threads.otherPublished, ids.b);
    await sql("delete from public.threads where id = $1", [threads.otherPublished]);
    assert.equal((await sql("select 1 from public.thread_images")).length, 0);
    assert.equal((await sql("select 1 from public.moderation_log")).length, 0);
  });
});

describe("cleanup queue", () => {
  test("every way an image is deleted queues its file once, with its size, owner and upload time", async () => {
    const byAuthor = await seedImage(threads.published, ids.a, {}, "3 hours");
    await seedImage(threads.otherPublished, ids.b);
    await seedImage(threads.otherPublished, ids.b, { size: 999_999, type: "image/jpeg" });
    await seedImage(threads.rejected, ids.a, {}, "2 days");
    const byServer = await seedImage(threads.pending, ids.a);
    const expected = await sql(
      "select storage_key, size_bytes, owner_id, created_at as uploaded_at from public.thread_images order by storage_key",
    );
    assert.equal(expected.length, 5);

    await removeImage(A, byAuthor);
    await as(MOD, "select public.delete_thread($1, 'Spam')", [threads.otherPublished]);
    await sql("delete from public.threads where id = $1", [threads.rejected]);
    await sql("delete from public.thread_images where id = $1", [byServer]);

    assert.equal((await sql("select 1 from public.thread_images")).length, 0);
    assert.deepEqual(
      await sql("select storage_key, size_bytes, owner_id, uploaded_at from public.media_deletions order by storage_key"),
      expected,
    );
    assert.equal((await sql("select 1 from public.media_deletions where queued_at = now()")).length, 5);
  });

  test("a member deleting through the API directly queues the files too", async () => {
    const added = await addImages(A, threads.published, [{}, {}]);
    assert.equal((await as(A, "delete from public.thread_images where thread_id = $1 returning id", [threads.published])).length, 2);
    const queued = await sql<{ owner_id: string }>("select owner_id from public.media_deletions");
    assert.deepEqual(queued, added.map(() => ({ owner_id: ids.a })));
  });

  test("a delete still goes through when its key is already queued", async () => {
    const key = newKey();
    const id = await seedImage(threads.published, ids.a, { key });
    await sql(
      "insert into public.media_deletions (storage_key, size_bytes, owner_id, uploaded_at) values ($1, 1, null, now() - interval '1 day')",
      [key],
    );
    assert.equal((await removeImage(A, id)).length, 1);
    assert.deepEqual(await sql("select size_bytes, owner_id from public.media_deletions"), [{ size_bytes: 1, owner_id: null }]);
  });

  test("a queued key cannot come back into any gallery before its file is deleted", async () => {
    const key = newKey();
    await removeImage(A, await addImage(A, threads.published, { key }));
    assert.deepEqual(await errorOf(() => addImage(A, threads.published, { key })), REUSED_KEY);
    assert.deepEqual(await errorOf(() => addImages(A, threads.published, [{}, { key }])), REUSED_KEY);
    assert.deepEqual(await errorOf(() => addImage(B, threads.otherPublished, { key })), REUSED_KEY);
    assert.equal((await sql("select 1 from public.thread_images")).length, 0);
    assert.deepEqual(await errorOf(() => seedImage(threads.otherPublished, ids.b, { key })), REUSED_KEY);
  });

  test("account deletion queues nothing; queued files lose their owner", async () => {
    await removeImage(A, await addImage(A, threads.published));
    const kept = await addImage(A, threads.published);
    await sql("delete from auth.users where id = $1", [ids.a]);
    assert.deepEqual(await sql("select owner_id from public.media_deletions"), [{ owner_id: null }]);
    assert.equal((await sql("select 1 from public.thread_images where id = $1", [kept])).length, 1);
  });
});

describe("per-thread limit", () => {
  test("three images fit; a fourth is refused until one is removed", async () => {
    const [first] = await addImages(A, threads.published, [{}, {}, {}]);
    assert.deepEqual(await errorOf(() => addImage(A, threads.published)), THREAD_FULL);
    await removeImage(A, first.id);
    await addImage(A, threads.published);
  });

  test("a batch of four is refused as a whole", async () => {
    assert.deepEqual(await errorOf(() => addImages(A, threads.published, [{}, {}, {}, {}])), THREAD_FULL);
    assert.equal((await sql("select 1 from public.thread_images")).length, 0);
  });

  test("moderators and the service role are held to it too", async () => {
    const own = await ownThread(ids.mod);
    await addImages(MOD, own, [{}, {}, {}]);
    assert.deepEqual(await errorOf(() => addImage(MOD, own)), THREAD_FULL);
    assert.deepEqual(await errorOf(() => seedImage(own, ids.mod)), THREAD_FULL);
  });
});

describe("per-member daily limit", () => {
  test("a seventh image within 24 hours is refused, as a batch too", async () => {
    await seedGalleries(ids.a, 5);
    assert.match((await errorOf(() => addImages(A, threads.published, [{}, {}]))).message, MEMBER_DAILY);
    assert.equal((await sql("select 1 from public.thread_images where thread_id = $1", [threads.published])).length, 0);
    await addImage(A, threads.published);
    const failure = await errorOf(() => addImage(A, threads.published));
    assert.match(failure.message, MEMBER_DAILY);
    assert.equal(failure.code, "P0001");
  });

  test("images older than 24 hours and other members' images do not count", async () => {
    await seedGalleries(ids.a, 6, "25 hours");
    await seedGalleries(ids.b, 6);
    await addImage(A, threads.published);
  });

  test("moderators and the service role are exempt", async () => {
    await seedGalleries(ids.mod, 6);
    await addImage(MOD, await ownThread(ids.mod));
    await seedGalleries(ids.a, 6);
    await seedImage(threads.published, ids.a);
  });
});

describe("site-wide daily limit", () => {
  test("the 301st image of the day is refused for members and moderators, not the service role", async () => {
    await seedGalleries(ids.b, 300);
    for (const [actor, thread] of [[A, threads.published], [MOD, await ownThread(ids.mod)]] as const) {
      const failure = await errorOf(() => addImage(actor, thread));
      assert.match(failure.message, SITE_DAILY);
      assert.equal(failure.code, "P0001");
    }
    await seedImage(threads.published, ids.a);
  });

  test("yesterday's uploads no longer count", async () => {
    await seedGalleries(ids.b, 300, "25 hours");
    await addImage(A, threads.published);
  });
});

describe("storage cap", () => {
  // The cap is 8,000 maximum-size images; four oversized rows stand in for them.
  async function fillStorage(bytes: number) {
    await sql("alter table public.thread_images drop constraint thread_images_size_bytes_check");
    await seedGalleries(ids.b, 4, "3 days", bytes / 4);
  }

  test("an upload may fill the storage exactly but not beyond, for everyone", async () => {
    await fillStorage(7_999_000_000);
    await addImage(A, threads.published, { size: 1_000_000 });
    assert.deepEqual(await errorOf(() => addImage(A, threads.published, { size: 1 })), STORAGE_FULL);
    for (const [actor, author] of [[MOD, ids.mod], [ADMIN, ids.admin]] as const) {
      const own = await ownThread(author);
      assert.deepEqual(await errorOf(() => addImage(actor, own, { size: 1 })), STORAGE_FULL);
    }
    assert.deepEqual(await errorOf(() => seedImage(threads.published, ids.a, { size: 1 })), STORAGE_FULL);
  });

  test("deleting images frees storage only once the cleanup has removed their files", async () => {
    await fillStorage(8_000_000_000);
    assert.deepEqual(await errorOf(() => addImage(A, threads.published)), STORAGE_FULL);
    await sql("delete from public.thread_images where id = (select min(id) from public.thread_images)");
    await sameError(() => check(A, threads.published, 1, 1000), () => addImage(A, threads.published), /^image storage is full$/);
    await runCleanup();
    await addImage(A, threads.published);
  });
});

describe("deleting and uploading again", () => {
  test("still stops a member at 6 images a day", async () => {
    const first = await addImages(A, threads.published, [{}, {}, {}]);
    await removeImages(A, first.map((row) => row.id));
    await addImages(A, threads.published, [{}, {}, {}]);
    await as(A, "delete from public.thread_images where thread_id = $1", [threads.published]);
    assert.equal((await sql("select 1 from public.thread_images")).length, 0);
    await sameError(() => check(A, threads.published, 1, 1000), () => addImage(A, threads.published), MEMBER_DAILY);
    await sameError(() => check(A, null, 1, 1000), () => addImage(A, threads.pending), MEMBER_DAILY);
  });

  test("a deleted image counts until 24 hours after its upload, for its own owner only", async () => {
    await seedGalleries(ids.a, 6, "25 hours");
    await seedGalleries(ids.b, 6);
    await sql("delete from public.thread_images");
    await addImage(A, threads.published);
    assert.match((await errorOf(() => addImage(B, threads.otherPublished))).message, MEMBER_DAILY);
  });

  test("still stops the forum at 300 images a day", async () => {
    await seedGalleries(ids.b, 300);
    await sql("delete from public.thread_images");
    await sameError(() => check(A, threads.published, 1, 1000), () => addImage(A, threads.published), SITE_DAILY);
  });

  test("the cleanup emptying the queue lets uploads continue", async () => {
    await seedGalleries(ids.b, 300);
    await sql("delete from public.thread_images");
    await runCleanup();
    await addImage(A, threads.published);
  });
});

describe("image changes as revisions", () => {
  const published = { title: "How do I extend my residence permit?", body: "Bring your Anmeldung" };

  test("adding to a published thread writes one revision per statement with the gallery before it", async () => {
    const [{ edited_at: before }] = await sql<{ edited_at: Date | null }>("select edited_at from public.threads where id = $1", [
      threads.published,
    ]);
    assert.equal(before, null);
    await addImage(A, threads.published);
    const first = await galleryKeys(threads.published);
    await addImages(A, threads.published, [{}, {}]);
    assert.deepEqual(await revisions(threads.published), [
      { ...published, edited_by: ids.a, image_keys: [] },
      { ...published, edited_by: ids.a, image_keys: first },
    ]);
    assert.equal(await editedNow(threads.published), true);
  });

  test("removing records the gallery as it was, in display order", async () => {
    const added = (await addImages(A, threads.published, [{}, {}, {}])).map((row) => row.id);
    const all = await galleryKeys(threads.published);
    await sql("delete from public.thread_revisions");
    await removeImages(A, [added[2], added[0]]);
    await removeImage(A, added[1]);
    assert.deepEqual(await revisions(threads.published), [
      { ...published, edited_by: ids.a, image_keys: all },
      { ...published, edited_by: ids.a, image_keys: [all[1]] },
    ]);
    assert.equal(await editedNow(threads.published), true);
  });

  test("an image change never passes for a text edit, and a later text edit keeps no keys", async () => {
    await addImage(A, threads.published);
    await as(A, "update public.threads set title = 'How do I extend my residence permit in Erlangen?' where id = $1", [threads.published]);
    assert.deepEqual(await revisions(threads.published), [
      { ...published, edited_by: ids.a, image_keys: [] },
      { ...published, edited_by: ids.a, image_keys: null },
    ]);
  });

  test("moderators read image revisions in the review queue; members do not", async () => {
    await addImage(A, threads.published);
    const queue = await as<{ thread_id: number; image_keys: string[] }>(
      MOD,
      "select thread_id, image_keys from public.thread_revisions where reviewed_at is null",
    );
    assert.deepEqual(queue, [{ thread_id: threads.published, image_keys: [] }]);
    assert.deepEqual(await as(A, "select 1 from public.thread_revisions"), []);
    await as(MOD, "update public.thread_revisions set reviewed_at = now() where thread_id = $1", [threads.published]);
  });

  test("pending and rejected threads keep no revisions; they are reviewed whole on approval", async () => {
    for (const thread of [threads.pending, threads.rejected]) {
      const id = await addImage(A, thread);
      await addImage(A, thread);
      await removeImage(A, id);
      assert.deepEqual(await revisions(thread), []);
      assert.equal(await editedNow(thread), null);
    }
  });

  test("a thread posted with its images is new, not edited, even when it goes live at once", async () => {
    const [{ slug }] = await as<{ slug: string }>(
      MOD,
      "select public.create_thread_with_images('Semester ticket pickup times', 'Body', $1, null, $2) as slug",
      [categories.courses, JSON.stringify([{ storage_key: newKey(), content_type: "image/webp", width: 800, height: 600, size_bytes: 1000 }])],
    );
    const [thread] = await sql<{ id: number; status: string; edited_at: Date | null }>(
      "select id, status, edited_at from public.threads where slug = $1",
      [slug],
    );
    assert.deepEqual([thread.status, thread.edited_at], ["published", null]);
    assert.deepEqual(await revisions(thread.id), []);
  });

  test("a moderator's change to their own older thread is reviewed like a member's", async () => {
    const own = await ownThread(ids.mod);
    await sql("update public.threads set created_at = now() - interval '2 days' where id = $1", [own]);
    await addImage(MOD, own);
    const revised = await revisions(own);
    assert.deepEqual(revised.map((row) => [row.edited_by, row.image_keys]), [[ids.mod, []]]);
  });

  test("one statement across threads writes one revision per public thread, archived included", async () => {
    await seedImage(threads.published, ids.a);
    await seedImage(threads.published, ids.a);
    const archivedKey = newKey();
    await seedImage(threads.archived, ids.b, { key: archivedKey });
    await seedImage(threads.pending, ids.a);
    const publishedKeys = await galleryKeys(threads.published);
    await sql("delete from public.thread_revisions");

    await sql("delete from public.thread_images");
    const rows = await sql<{ thread_id: number; edited_by: string | null; image_keys: string[] }>(
      "select thread_id, edited_by, image_keys from public.thread_revisions order by thread_id",
    );
    assert.deepEqual(rows, [
      { thread_id: threads.published, edited_by: null, image_keys: publishedKeys },
      { thread_id: threads.archived, edited_by: null, image_keys: [archivedKey] },
    ].sort((x, y) => x.thread_id - y.thread_id));
    assert.equal(await editedNow(threads.archived), true);
  });

  const verification = async (thread: number) =>
    (await sql<{ verified: boolean; verified_by: string | null }>(
      "select last_verified_at is not null as verified, verified_by from public.threads where id = $1",
      [thread],
    ))[0];

  test("a member adding or removing an image drops the verification, like a text edit", async () => {
    await as(MOD, "select public.mark_thread_verified($1)", [threads.published]);
    const id = await addImage(A, threads.published);
    assert.deepEqual(await verification(threads.published), { verified: false, verified_by: null });

    await as(MOD, "select public.mark_thread_verified($1)", [threads.published]);
    await removeImage(A, id);
    assert.deepEqual(await verification(threads.published), { verified: false, verified_by: null });
  });

  test("a moderator's change to their own thread and the service role keep the verification", async () => {
    const own = await ownThread(ids.mod);
    await sql("update public.threads set created_at = now() - interval '2 days' where id = $1", [own]);
    await as(MOD, "select public.mark_thread_verified($1)", [own]);
    const id = await addImage(MOD, own);
    await removeImage(MOD, id);
    assert.deepEqual(await verification(own), { verified: true, verified_by: ids.mod });

    await as(MOD, "select public.mark_thread_verified($1)", [threads.published]);
    await seedImage(threads.published, ids.a);
    await sql("delete from public.thread_images where thread_id = $1", [threads.published]);
    assert.deepEqual(await verification(threads.published), { verified: true, verified_by: ids.mod });
    assert.equal((await revisions(threads.published)).length, 2);
  });

  test("deleting a thread writes no revision for the images it takes along", async () => {
    await addImage(A, threads.published);
    await seedImage(threads.otherPublished, ids.b);
    await as(MOD, "select public.delete_thread($1, 'Spam')", [threads.published]);
    await sql("delete from public.threads where id = $1", [threads.otherPublished]);
    assert.deepEqual(await sql("select thread_id from public.thread_revisions"), []);
    assert.equal((await sql("select 1 from public.media_deletions")).length, 2);
  });
});

describe("check_image_upload", () => {
  test("passes silently when the images fit", async () => {
    await check(A, threads.published, 3, 3_000_000);
    await check(A, threads.pending, 1, 1000);
    await check(A, null, 3, 3_000_000);
    await check(MOD, await ownThread(ids.mod), 2, 1000);
    await check(A, threads.published, 0, 0);
    await check(A, null, 0, 0);
  });

  test("rejects negative counts and sizes", async () => {
    assert.equal((await errorOf(() => check(A, threads.published, -1, 0))).code, "22023");
    assert.equal((await errorOf(() => check(A, threads.published, 1, -5))).code, "22023");
    assert.equal((await errorOf(() => check(A, null, 1, -5))).code, "22023");
  });

  test("anon cannot call it", async () => {
    assert.match((await errorOf(() => check(anon, threads.published, 1, 1000))).message, /permission denied for function check_image_upload/);
  });

  test("predicts a mute and a ban", async () => {
    await restrict(ids.a, "mute");
    await sameError(() => check(A, threads.published, 1, 1000), () => addImage(A, threads.published), /^your account is muted/);
    await restrict(ids.b, "ban");
    await sameError(() => check(B, threads.otherPublished, 1, 1000), () => addImage(B, threads.otherPublished), /^your account is banned/);
  });

  test("predicts a thread the caller may not change, without telling whether it exists", async () => {
    const [{ id: hiddenPending }] = await sql<{ id: number }>(
      "insert into public.threads (title, body, category_id, author_id) values ('Bilal asks about Mensa prices', 'Body', $1, $2) returning id",
      [categories.courses, ids.b],
    );
    for (const thread of [threads.otherPublished, hiddenPending, 999_999]) {
      assert.deepEqual(await errorOf(() => check(A, thread, 1, 1000)), NOT_YOURS);
    }
    await sameError(() => check(A, hiddenPending, 1, 1000), () => addImage(A, hiddenPending), /^only the author can add images/);
  });

  test("predicts a moderator's attempt on a member's thread", async () => {
    await sameError(() => check(MOD, threads.published, 1, 1000), () => addImage(MOD, threads.published), /^only the author can add images/);
    await sameError(() => check(ADMIN, threads.pending, 1, 1000), () => addImage(ADMIN, threads.pending), /^only the author can add images/);
  });

  test("predicts an archived thread", async () => {
    await sameError(() => check(B, threads.archived, 1, 1000), () => addImage(B, threads.archived), /archived threads are read-only/);
  });

  test("predicts a full thread, counting the images already there", async () => {
    await seedImage(threads.published, ids.a);
    await seedImage(threads.published, ids.a);
    await check(A, threads.published, 1, 1000);
    await sameError(() => check(A, threads.published, 2, 2000), () => addImages(A, threads.published, [{}, {}]), /at most 3 images/);
  });

  test("lets the author replace an image of a full gallery: the removed image leaves its room", async () => {
    const gallery = [await seedImage(threads.published, ids.a), await seedImage(threads.published, ids.a), await seedImage(threads.published, ids.a)];
    const keys = await galleryKeys(threads.published);
    const otherThreadImage = await seedImage(threads.pending, ids.a);
    for (const removed of [undefined, null, [], [null], [otherThreadImage]]) {
      assert.deepEqual(await errorOf(() => check(A, threads.published, 1, 1000, removed)), THREAD_FULL, JSON.stringify(removed));
    }
    await check(A, threads.published, 1, 1000, [gallery[1]]);
    await check(A, threads.published, 2, 2000, [gallery[0], gallery[2], otherThreadImage]);
    assert.deepEqual(await errorOf(() => check(A, threads.published, 2, 2000, [gallery[1]])), THREAD_FULL);

    await removeImage(A, gallery[1]);
    const replacement = newKey();
    await addImage(A, threads.published, { key: replacement });
    assert.deepEqual(await galleryKeys(threads.published), [keys[0], keys[2], replacement]);
  });

  test("a removed image still counts toward the daily limits and the storage", async () => {
    const gallery = [await seedImage(threads.published, ids.a), await seedImage(threads.published, ids.a), await seedImage(threads.published, ids.a)];
    await seedGalleries(ids.a, 3);
    assert.match((await errorOf(() => check(A, threads.published, 1, 1000, [gallery[0]]))).message, MEMBER_DAILY);
    await removeImage(A, gallery[0]);
    await sameError(() => check(A, threads.published, 1, 1000), () => addImage(A, threads.published), MEMBER_DAILY);
  });

  test("predicts the member's daily limit for a batch", async () => {
    await seedGalleries(ids.a, 5);
    await check(A, threads.published, 1, 1000);
    await sameError(() => check(A, threads.published, 2, 2000), () => addImages(A, threads.published, [{}, {}]), MEMBER_DAILY);
  });

  test("predicts the site-wide limit", async () => {
    await seedGalleries(ids.b, 299);
    const own = await ownThread(ids.mod);
    await check(MOD, own, 1, 1000);
    await sameError(() => check(MOD, own, 2, 2000), () => addImages(MOD, own, [{}, {}]), SITE_DAILY);
  });

  test("predicts full storage from the total size", async () => {
    await sql("alter table public.thread_images drop constraint thread_images_size_bytes_check");
    await seedGalleries(ids.b, 4, "3 days", 1_999_750_000);
    await check(A, threads.published, 1, 1_000_000);
    await sameError(
      () => check(A, threads.published, 2, 1_000_001),
      () => addImages(A, threads.published, [{ size: 1_000_000 }, { size: 1 }]),
      /image storage is full/,
    );
  });

  test("the thread count wins over the daily limits, as in the insert", async () => {
    await seedGalleries(ids.a, 6);
    await seedImage(threads.published, ids.a, {}, "2 days");
    await seedImage(threads.published, ids.a, {}, "2 days");
    await seedImage(threads.published, ids.a, {}, "2 days");
    await sameError(() => check(A, threads.published, 1, 1000), () => addImage(A, threads.published), /at most 3 images/);
  });

  describe("for a new thread", () => {
    const images = (count: number) =>
      Array.from({ length: count }, () => ({ storage_key: newKey(), content_type: "image/webp", width: 800, height: 600, size_bytes: 1000, alt_text: null }));
    const create = (actor: Actor, count: number) => () =>
      as(actor, "select public.create_thread_with_images('Where to buy a used bicycle?', 'Body', $1, null, $2)", [
        categories.courses,
        JSON.stringify(images(count)),
      ]);

    test("predicts too many images", async () => {
      await sameError(() => check(A, null, 4, 4000), create(A, 4), /at most 3 images/);
    });

    test("predicts the member's daily image limit", async () => {
      await seedGalleries(ids.a, 5);
      await sameError(() => check(A, null, 2, 2000), create(A, 2), MEMBER_DAILY);
    });

    test("predicts the site-wide limit and full storage", async () => {
      await seedGalleries(ids.b, 300);
      await sameError(() => check(A, null, 1, 1000), create(A, 1), SITE_DAILY);
      await sql("delete from public.thread_images");
      await runCleanup();
      await sql("alter table public.thread_images drop constraint thread_images_size_bytes_check");
      await seedGalleries(ids.b, 4, "3 days", 2_000_000_000);
      await sameError(() => check(A, null, 1, 1000), create(A, 1), /^image storage is full$/);
    });

    // The thread's own rules are create_thread_with_images()'s to enforce; the server deletes the
    // uploaded files when it fails.
    test("checks only the image limits, not the thread's own rules", async () => {
      await createThread(ids.a, "pending", "Second pending question from Ayesha");
      await createThread(ids.a, "pending", "Third pending question from Ayesha");
      await check(A, null, 1, 1000);
      assert.match((await errorOf(create(A, 1))).message, /^you already have 3 threads waiting for review$/);

      await sql("update public.threads set created_at = now() - interval '3 days', status = 'published'");
      for (let n = 0; n < 10; n++) await createThread(ids.b, "published", `Bilal's question number ${n}`);
      await check(B, null, 1, 1000);
      assert.match((await errorOf(create(B, 1))).message, /^rate limit: You have reached the daily limit for new threads/);

      await restrict(ids.a, "mute");
      await check(A, null, 1, 1000);
      assert.match((await errorOf(create(A, 1))).message, /^your account is muted/);
      assert.equal((await sql("select 1 from public.thread_images")).length, 0);
    });
  });
});

describe("create_thread_with_images", () => {
  const image = (overrides: Record<string, unknown> = {}) => ({
    storage_key: newKey(),
    content_type: "image/webp",
    width: 1200,
    height: 900,
    size_bytes: 180_000,
    alt_text: "Bike rack at Erlangen Hauptbahnhof",
    ...overrides,
  });
  const create = (actor: Actor, title: string, images: unknown, city: string | null = "erlangen") =>
    as<{ slug: string }>(actor, "select public.create_thread_with_images($1, 'Any tips?', $2, $3, $4) as slug", [
      title,
      categories.courses,
      city,
      images === null ? null : JSON.stringify(images),
    ]);
  const threadByTitle = (title: string) =>
    sql<{ id: number; slug: string; status: string; author_id: string; city: string | null }>(
      "select id, slug, status, author_id, city from public.threads where title = $1",
      [title],
    );

  test("a member posts a pending thread with its gallery in the order given", async () => {
    const images = [
      image(),
      image({ content_type: "image/jpeg", storage_key: newKey("image/jpeg"), alt_text: null }),
      image({ alt_text: "Fahrradladen in der Hauptstraße" }),
    ];
    const [{ slug }] = await create(A, "Where to buy a used bicycle?", images);
    const [thread] = await threadByTitle("Where to buy a used bicycle?");
    assert.equal(thread.slug, slug);
    assert.match(slug, /^where-to-buy-a-used-bicycle-[0-9a-f]{6}$/);
    assert.equal(thread.status, "pending");
    assert.equal(thread.author_id, ids.a);
    const rows = await sql("select storage_key, owner_id, alt_text from public.thread_images where thread_id = $1 order by id", [thread.id]);
    assert.deepEqual(rows, [
      { storage_key: images[0].storage_key, owner_id: ids.a, alt_text: "Bike rack at Erlangen Hauptbahnhof" },
      { storage_key: images[1].storage_key, owner_id: ids.a, alt_text: null },
      { storage_key: images[2].storage_key, owner_id: ids.a, alt_text: "Fahrradladen in der Hauptstraße" },
    ]);
    const queue = await sql("select 1 from public.notifications where type = 'mod_new_thread' and thread_id = $1", [thread.id]);
    assert.equal(queue.length, 2);
  });

  test("a moderator's thread goes live at once", async () => {
    await create(MOD, "Semester ticket pickup times", [image()], null);
    const [thread] = await threadByTitle("Semester ticket pickup times");
    assert.equal(thread.status, "published");
    assert.equal(thread.city, null);
  });

  test("no images, or null, posts the thread alone", async () => {
    await create(A, "Thread without any photos", []);
    await create(A, "Another thread without photos", null);
    assert.equal((await threadByTitle("Thread without any photos")).length, 1);
    assert.equal((await threadByTitle("Another thread without photos")).length, 1);
    assert.equal((await sql("select 1 from public.thread_images")).length, 0);
  });

  const failures: [string, () => unknown[], string][] = [
    ["a fourth image", () => [image(), image(), image(), image()], "P0001"],
    ["an image whose key does not match its type", () => [image(), image({ content_type: "image/jpeg" })], "23514"],
    ["an oversized image", () => [image({ size_bytes: 1_000_001 })], "23514"],
    ["an image without a key", () => [image({ storage_key: undefined })], "23502"],
    ["a key already in use", () => {
      const reused = image();
      return [reused, { ...reused }];
    }, "23505"],
  ];
  for (const [name, images, code] of failures) {
    test(`${name} takes the thread back out`, async () => {
      const notifications = async () => (await sql("select 1 from public.notifications")).length;
      const before = await notifications();
      assert.equal((await errorOf(() => create(A, "Rolled back bicycle thread", images()))).code, code);
      assert.equal((await threadByTitle("Rolled back bicycle thread")).length, 0);
      assert.equal(await notifications(), before);
    });
  }

  test("a key queued for deletion takes the thread back out", async () => {
    const key = newKey();
    await removeImage(A, await addImage(A, threads.published, { key }));
    assert.deepEqual(await errorOf(() => create(A, "Rolled back bicycle thread", [image({ storage_key: key })])), REUSED_KEY);
    assert.equal((await threadByTitle("Rolled back bicycle thread")).length, 0);
  });

  test("a daily image limit takes the thread back out", async () => {
    await seedGalleries(ids.a, 5);
    assert.match((await errorOf(() => create(A, "Rolled back bicycle thread", [image(), image()]))).message, MEMBER_DAILY);
    assert.equal((await threadByTitle("Rolled back bicycle thread")).length, 0);
  });

  test("the thread's own rules still apply", async () => {
    assert.equal((await errorOf(() => create(A, "Short", [image()]))).code, "23514");
    await restrict(ids.a, "mute");
    assert.match((await errorOf(() => create(A, "Muted member's bicycle thread", []))).message, /^your account is muted/);
    assert.equal((await sql("select 1 from public.thread_images")).length, 0);
  });

  test("images must be a JSON array", async () => {
    assert.equal((await errorOf(() => create(A, "Where to buy a used bicycle?", image()))).code, "22023");
  });

  test("only signed-in users may call it", async () => {
    assert.match(
      (await errorOf(() => create(anon, "Where to buy a used bicycle?", []))).message,
      /permission denied for function create_thread_with_images/,
    );
  });
});

describe("account deletion", () => {
  test("images stay with the thread as a deleted user's", async () => {
    const id = await addImage(A, threads.published);
    await sql("delete from auth.users where id = $1", [ids.a]);
    const [row] = await sql<{ owner_id: string | null }>("select owner_id from public.thread_images where id = $1", [id]);
    assert.equal(row.owner_id, null);
    assert.deepEqual(await imageIds(anon), [id]);
  });

  test("nobody changes a deleted user's gallery any more", async () => {
    const id = await addImage(A, threads.published);
    await sql("delete from auth.users where id = $1", [ids.a]);
    for (const actor of [MOD, ADMIN]) {
      assert.equal((await removeImage(actor, id)).length, 0);
      assert.deepEqual(await errorOf(() => addImage(actor, threads.published)), NOT_YOURS);
    }
    assert.deepEqual(await imageIds(anon), [id]);
  });
});
