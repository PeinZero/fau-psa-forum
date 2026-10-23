import type { Page } from "@playwright/test";

import {
  adminClient,
  expect,
  hasE2eEnv,
  newUser,
  pageAs,
  seedComment,
  seedThread,
  test,
  uid,
  unreadNotifications,
} from "./fixtures";

test.skip(!hasE2eEnv, "needs a Supabase test project (see docs/testing.md)");

/** Whether the server stored the switch; the thread menu flips optimistically before it does. */
async function savedRows(table: "bookmarks" | "thread_follows", userId: string, threadId: number): Promise<number> {
  const { count, error } = await adminClient()
    .from(table)
    .select("thread_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("thread_id", threadId);
  if (error) throw error;
  return count ?? 0;
}

/** The signed-out fallback menu has no bookmark button, so its presence means the viewer's menu is in. */
async function openThreadMenu(page: Page) {
  await expect(page.getByRole("button", { name: "Bookmark thread" })).toBeVisible();
  await page.getByRole("button", { name: "Thread actions" }).click();
}

function savedTabs(page: Page) {
  const nav = page.getByRole("navigation", { name: "Saved lists" });
  return {
    bookmarked: nav.getByRole("link", { name: "Bookmarked", exact: true }),
    following: nav.getByRole("link", { name: "Following", exact: true }),
  };
}

test("bookmarks a thread and lists it under Bookmarked", async ({ browser }) => {
  const user = await newUser();
  const title = `Bookmark me ${uid()}`;
  const thread = await seedThread(title);
  const page = await pageAs(browser, user);

  await page.goto(`/t/${thread.slug}`);
  const bookmark = page.getByRole("button", { name: "Bookmark thread" });
  await expect(bookmark).toHaveAttribute("aria-pressed", "false");
  await bookmark.click();
  await expect(bookmark).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => savedRows("bookmarks", user.id, thread.id)).toBe(1);

  await page.goto("/saved");
  await expect(savedTabs(page).bookmarked).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: title })).toBeVisible();
});

test("following a thread notifies about new comments until unfollowed", async ({ browser }) => {
  // Neither author nor commenter, so the follower starts out not following.
  const follower = await newUser();
  const commenter = await newUser();
  const thread = await seedThread(`Follow me ${uid()}`);
  const page = await pageAs(browser, follower);
  const follow = page.getByRole("menuitemcheckbox", { name: "Follow thread" });

  await page.goto(`/t/${thread.slug}`);
  await openThreadMenu(page);
  await expect(follow).toHaveAttribute("aria-checked", "false");
  await follow.click();
  await expect.poll(() => savedRows("thread_follows", follower.id, thread.id)).toBe(1);

  await seedComment(thread.id, commenter.id, `First answer ${uid()}`);
  await expect.poll(() => unreadNotifications(follower.id, "followed_thread_activity")).toBe(1);

  await openThreadMenu(page);
  await expect(follow).toHaveAttribute("aria-checked", "true");
  await follow.click();
  await expect.poll(() => savedRows("thread_follows", follower.id, thread.id)).toBe(0);

  // Notifications are written by the comment's insert trigger, so the count is final right away.
  await seedComment(thread.id, commenter.id, `Second answer ${uid()}`);
  expect(await unreadNotifications(follower.id, "followed_thread_activity")).toBe(1);
});

test("the Following tab lists followed threads, the Bookmarked tab bookmarked ones", async ({ browser }) => {
  const user = await newUser();
  const bookmarkedTitle = `Bookmarked only ${uid()}`;
  const followedTitle = `Started by me ${uid()}`;
  const bookmarked = await seedThread(bookmarkedTitle);
  // Authors follow their own thread automatically.
  await seedThread(followedTitle, { authorId: user.id });
  const { error } = await adminClient().from("bookmarks").insert({ user_id: user.id, thread_id: bookmarked.id });
  if (error) throw error;

  const page = await pageAs(browser, user);
  const tabs = savedTabs(page);
  await page.goto("/saved");
  await expect(tabs.bookmarked).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: bookmarkedTitle })).toBeVisible();
  await expect(page.getByRole("link", { name: followedTitle })).toHaveCount(0);

  await tabs.following.click();
  await expect(page).toHaveURL(/\/saved\?tab=following$/);
  await expect(tabs.following).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: followedTitle })).toBeVisible();
  await expect(page.getByRole("link", { name: bookmarkedTitle })).toHaveCount(0);

  await tabs.bookmarked.click();
  await expect(tabs.bookmarked).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: bookmarkedTitle })).toBeVisible();
  await expect(page.getByRole("link", { name: followedTitle })).toHaveCount(0);
});
