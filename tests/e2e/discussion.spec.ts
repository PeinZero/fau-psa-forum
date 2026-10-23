import type { Page } from "@playwright/test";

import {
  adminClient,
  expect,
  hasE2eEnv,
  newUser,
  pageAs,
  seedComment,
  seededUsers,
  seedThread,
  test,
  uid,
  unreadNotifications,
} from "./fixtures";

test.skip(!hasE2eEnv, "needs a Supabase test project (see docs/testing.md)");

/** Opens a published thread and waits until the signed-in comments replaced the public fallback. */
async function openThread(page: Page, slug: string) {
  await page.goto(`/t/${slug}`);
  await expect(page.getByLabel("Add a comment")).toBeVisible();
}

function commentAnchor(page: Page, commentId: number) {
  return page.locator(`#comment-${commentId}`);
}

async function openCommentMenu(page: Page, commentId: number) {
  await commentAnchor(page, commentId).getByRole("button", { name: "More actions" }).click();
}

async function storedScore(commentId: number): Promise<number | undefined> {
  const { data } = await adminClient().from("comments").select("score").eq("id", commentId).single();
  return data?.score;
}

function reputationStat(page: Page) {
  return page.locator("dl > div").filter({ hasText: "Reputation" }).locator("dd");
}

test("a comment on someone's thread lights up their bell and lists on /notifications", async ({ browser }) => {
  const [a, b] = [await newUser(), await newUser()];
  const title = `Bell rings ${uid()}`;
  const { slug } = await seedThread(title, { authorId: a.id });

  const aPage = await pageAs(browser, a);
  await aPage.goto("/");
  await expect(aPage.getByRole("link", { name: "Notifications", exact: true })).toBeVisible();

  const bPage = await pageAs(browser, b);
  await openThread(bPage, slug);
  await bPage.getByLabel("Add a comment").fill("The Ausländerbehörde answered within a week.");
  await bPage.getByRole("button", { name: "Post comment" }).click();
  await expect(bPage.getByText("The Ausländerbehörde answered within a week.")).toBeVisible();

  // Live via Realtime, or the resync once the channel is subscribed.
  const bell = aPage.getByRole("link", { name: "Notifications, 1 unread", exact: true });
  await expect(bell).toBeVisible({ timeout: 15_000 });
  await bell.click();
  await expect(aPage).toHaveURL(/\/notifications$/);
  await expect(
    aPage.getByRole("link").filter({ hasText: `${b.displayName} commented on your thread “${title}”` }),
  ).toBeVisible();
});

test("a reply sits in the parent's reply list and notifies the parent's author", async ({ browser }) => {
  const [a, b] = [await newUser(), await newUser()];
  const { id: threadId, slug } = await seedThread(`Replies nest ${uid()}`, { authorId: a.id });
  const parent = await seedComment(threadId, a.id, "Bring your rental contract to the appointment.");

  const page = await pageAs(browser, b);
  await openThread(page, slug);
  await commentAnchor(page, parent.id).getByRole("button", { name: "Reply" }).click();

  const replyBox = page.getByLabel("Write a reply");
  await expect(replyBox).toHaveValue(`@${a.username} `);
  await replyBox.fill(`@${a.username} The Wohnungsgeberbestätigung too.`);
  await page
    .locator("form")
    .filter({ has: replyBox })
    .getByRole("button", { name: "Reply", exact: true })
    .click();

  const group = page.getByRole("listitem").filter({ has: commentAnchor(page, parent.id) });
  await expect(group.getByRole("list", { name: "1 reply" }).getByRole("listitem")).toContainText(
    "The Wohnungsgeberbestätigung too.",
  );
  await expect.poll(() => unreadNotifications(a.id, "reply")).toBe(1);
});

test("the @mention picker inserts a handle and the mentioned user is notified", async ({ browser }) => {
  const [a, b] = [await newUser(), await newUser()];
  const c = await newUser("member", `Mention ${uid()}`);
  const { slug } = await seedThread(`Mentions notify ${uid()}`, { authorId: a.id });

  const page = await pageAs(browser, b);
  await openThread(page, slug);
  const box = page.getByLabel("Add a comment");
  await box.fill("Ask ");
  await box.pressSequentially(`@${c.username.slice(0, -2)}`);

  await expect(page.getByRole("listbox", { name: "Mention suggestions" })).toBeVisible();
  await page.getByRole("option", { name: `@${c.username}` }).click();
  await expect(box).toHaveValue(`Ask @${c.username} `);

  await box.pressSequentially("about the TK form.");
  await page.getByRole("button", { name: "Post comment" }).click();
  await expect(page.getByText("about the TK form.")).toBeVisible();
  await expect.poll(() => unreadNotifications(c.id, "mention")).toBe(1);
});

test("the author edits their comment from the menu and it shows as edited", async ({ browser }) => {
  const [a, b] = [await newUser(), await newUser()];
  const { id: threadId, slug } = await seedThread(`Edits show ${uid()}`, { authorId: a.id });
  const comment = await seedComment(threadId, b.id, "The office opens at 8.");

  const page = await pageAs(browser, b);
  await openThread(page, slug);
  await openCommentMenu(page, comment.id);
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await page.getByLabel("Edit comment").fill("The office opens at 7:30 on Tuesdays.");
  await commentAnchor(page, comment.id).getByRole("button", { name: "Save" }).click();

  const anchor = commentAnchor(page, comment.id);
  await expect(anchor).toContainText("The office opens at 7:30 on Tuesdays.");
  await expect(anchor.getByText("edited", { exact: true })).toBeVisible();
});

test("Copy link puts the comment's anchor URL on the clipboard", async ({ browser }) => {
  const [a, b] = [await newUser(), await newUser()];
  const { id: threadId, slug } = await seedThread(`Links copy ${uid()}`, { authorId: a.id });
  const comment = await seedComment(threadId, a.id, "Link me from WhatsApp.");

  const page = await pageAs(browser, b);
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await openThread(page, slug);
  await openCommentMenu(page, comment.id);
  await page.getByRole("menuitem", { name: "Copy link" }).click();

  await expect(page.getByText("Link copied")).toBeVisible();
  const origin = new URL(page.url()).origin;
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe(`${origin}/t/${slug}#comment-${comment.id}`);
});

test("votes on someone else's comment move the score and persist; own comments can't be voted on", async ({
  browser,
}) => {
  const [a, b] = [await newUser(), await newUser()];
  const { id: threadId, slug } = await seedThread(`Scores move ${uid()}`, { authorId: a.id });
  const theirs = await seedComment(threadId, a.id, "Book the appointment online.");
  const own = await seedComment(threadId, b.id, "Walk-ins work too.");

  const page = await pageAs(browser, b);
  await openThread(page, slug);
  const votes = commentAnchor(page, theirs.id).getByRole("group", { name: "Vote" });

  await votes.getByRole("button", { name: "Upvote" }).click();
  await expect(votes).toHaveText("1 point");
  await expect.poll(() => storedScore(theirs.id)).toBe(1);
  // The control ignores clicks while a vote is still being saved.
  await expect(votes).not.toHaveAttribute("aria-busy", "true");
  await votes.getByRole("button", { name: "Downvote" }).click();
  await expect(votes).toHaveText("-1 point");
  await expect.poll(() => storedScore(theirs.id)).toBe(-1);

  await page.reload();
  await expect(votes).toHaveText("-1 point");
  await expect(votes.getByRole("button", { name: "Downvote" })).toHaveAttribute("aria-pressed", "true");

  const ownVotes = commentAnchor(page, own.id).getByRole("group", { name: "Vote" });
  await expect(ownVotes.getByRole("button", { name: "Upvote" })).toBeDisabled();
  await expect(ownVotes.getByRole("button", { name: "Downvote" })).toBeDisabled();
});

test("Top sorts by score and Newest by time", async ({ browser }) => {
  const [a, b] = [await newUser(), await newUser()];
  const { id: threadId, slug } = await seedThread(`Sorting flips ${uid()}`, { authorId: a.id });
  const older = await seedComment(threadId, a.id, "Older but upvoted answer.");
  await seedComment(threadId, b.id, "Newer answer without votes.");
  const { member, moderator } = seededUsers();
  const { error } = await adminClient()
    .from("comment_votes")
    .insert([
      { comment_id: older.id, user_id: member.id, value: 1 },
      { comment_id: older.id, user_id: moderator.id, value: 1 },
    ]);
  if (error) throw error;

  const page = await pageAs(browser, b);
  await openThread(page, slug);
  const comments = page.locator('[id^="comment-"]');
  await expect(comments).toHaveText([/Older but upvoted answer\./, /Newer answer without votes\./]);
  await expect(commentAnchor(page, older.id).getByRole("group", { name: "Vote" })).toHaveText("2 points");

  await page.getByRole("group", { name: "Sort comments" }).getByRole("button", { name: "Newest" }).click();
  await expect(page).toHaveURL(/\?sort=new$/);
  await expect(comments).toHaveText([/Newer answer without votes\./, /Older but upvoted answer\./]);
});

test("a moderator's best answer notifies its author and adds 15 reputation", async ({ browser }) => {
  const [a, b] = [await newUser(), await newUser()];
  const moderator = await newUser("moderator");
  const { id: threadId, slug } = await seedThread(`Best answer ${uid()}`, { authorId: a.id });
  const answer = await seedComment(threadId, b.id, "Use the online form, it takes two minutes.");

  const bPage = await pageAs(browser, b);
  await bPage.goto(`/u/${b.username}`);
  await expect(reputationStat(bPage)).toHaveText("0");

  const modPage = await pageAs(browser, moderator);
  await openThread(modPage, slug);
  await openCommentMenu(modPage, answer.id);
  await modPage.getByRole("menuitem", { name: "Mark best answer" }).click();
  await expect(commentAnchor(modPage, answer.id).getByText("Best answer", { exact: true })).toBeVisible();

  await expect.poll(() => unreadNotifications(b.id, "best_answer")).toBe(1);
  await bPage.reload();
  await expect(reputationStat(bPage)).toHaveText("15");
});

test("a hidden comment disappears for members and comes back when unhidden", async ({ browser }) => {
  const [a, b] = [await newUser(), await newUser()];
  const moderator = await newUser("moderator");
  const { id: threadId, slug } = await seedThread(`Hiding works ${uid()}`, { authorId: a.id });
  const body = "Selling my semester ticket, DM me.";
  const comment = await seedComment(threadId, a.id, body);

  const modPage = await pageAs(browser, moderator);
  await openThread(modPage, slug);
  await openCommentMenu(modPage, comment.id);
  await modPage.getByRole("menuitem", { name: "Hide comment" }).click();
  await modPage.getByRole("dialog", { name: "Hide comment" }).getByRole("button", { name: "Hide comment" }).click();
  await expect(commentAnchor(modPage, comment.id)).toContainText("Hidden by a moderator");

  const memberPage = await pageAs(browser, b);
  await openThread(memberPage, slug);
  await expect(memberPage.getByText(body)).toHaveCount(0);

  await openCommentMenu(modPage, comment.id);
  await modPage.getByRole("menuitem", { name: "Unhide comment" }).click();
  await expect(commentAnchor(modPage, comment.id)).not.toContainText("Hidden by a moderator");

  await openThread(memberPage, slug);
  await expect(memberPage.getByText(body)).toBeVisible();
});
