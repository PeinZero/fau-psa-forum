import type { Page } from "@playwright/test";

import { adminClient, expect, hasE2eEnv, newUser, pageAs, seedComment, seedReport, seedThread, test, uid } from "./fixtures";

test.skip(!hasE2eEnv, "needs a Supabase test project (see docs/testing.md)");

async function openCommentReport(page: Page, commentId: number) {
  await page.locator(`#comment-${commentId}`).getByRole("button", { name: "More actions" }).click();
  await page.getByRole("menuitem", { name: "Report", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Report this comment" });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Thread, comment by someone else, and the member who will report it. */
async function reportableComment() {
  const reporter = await newUser();
  const author = await newUser();
  const thread = await seedThread(`Report target ${uid()}`);
  const body = `Questionable advice ${uid()}`;
  const comment = await seedComment(thread.id, author.id, body);
  return { reporter, thread, comment, body };
}

test("a member reports a comment and a moderator resolves it", async ({ browser }) => {
  const { reporter, thread, comment, body } = await reportableComment();
  const moderator = await newUser("moderator");
  const note = `The fee changed last semester ${uid()}`;

  const page = await pageAs(browser, reporter);
  await page.goto(`/t/${thread.slug}`);
  const dialog = await openCommentReport(page, comment.id);
  await dialog.getByRole("radio", { name: "Wrong or outdated information" }).check();
  await dialog.getByLabel("Details (optional)").fill(note);
  await dialog.getByRole("button", { name: "Submit report" }).click();
  await expect(page.getByRole("heading", { name: "Thanks for reporting" })).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();

  // The queue is shared by every test, so the card is found by its unique comment text.
  const mod = await pageAs(browser, moderator);
  await mod.goto("/mod/reports");
  const card = mod.getByRole("listitem").filter({ hasText: body });
  await expect(card).toBeVisible();
  await expect(card.getByText("Wrong information", { exact: true })).toBeVisible();
  await expect(card.getByText(note)).toBeVisible();

  await card.getByRole("button", { name: "Resolve", exact: true }).click();
  await expect(card).toHaveCount(0);

  await mod.getByRole("navigation", { name: "Report status" }).getByRole("link", { name: "Resolved", exact: true }).click();
  const resolved = mod.getByRole("listitem").filter({ hasText: body });
  await expect(resolved).toBeVisible();
  await expect(resolved.getByRole("button", { name: "Reopen" })).toBeVisible();
});

test("reporting the same comment again is refused politely", async ({ browser }) => {
  const { reporter, thread, comment } = await reportableComment();
  await seedReport(reporter.id, { commentId: comment.id });

  const page = await pageAs(browser, reporter);
  await page.goto(`/t/${thread.slug}`);
  const dialog = await openCommentReport(page, comment.id);
  await dialog.getByRole("radio", { name: "Spam" }).check();
  await dialog.getByRole("button", { name: "Submit report" }).click();
  await expect(dialog.getByRole("alert")).toHaveText("You already reported this. Moderators will look at it.");
  await expect(page.getByRole("heading", { name: "Thanks for reporting" })).toHaveCount(0);

  const { count, error } = await adminClient()
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("reporter_id", reporter.id)
    .eq("comment_id", comment.id);
  if (error) throw error;
  expect(count).toBe(1);
});

test("a member requests an update and a moderator resolves it", async ({ browser }) => {
  const member = await newUser();
  const moderator = await newUser("moderator");
  const title = `Needs an update ${uid()}`;
  const thread = await seedThread(title);
  const note = `The office moved to a new address ${uid()}`;

  const page = await pageAs(browser, member);
  await page.goto(`/t/${thread.slug}`);
  // The signed-out fallback menu has no bookmark button, so this waits for the viewer's menu.
  await expect(page.getByRole("button", { name: "Bookmark thread" })).toBeVisible();
  await page.getByRole("button", { name: "Thread actions" }).click();
  await page.getByRole("menuitem", { name: "Request an update" }).click();
  const dialog = page.getByRole("dialog", { name: "Request an update" });
  await dialog.getByLabel("What changed? (optional)").fill(note);
  await dialog.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByRole("heading", { name: "Thanks, request sent" })).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();

  const mod = await pageAs(browser, moderator);
  await mod.goto("/mod/updates");
  const card = mod.getByRole("listitem").filter({ hasText: title });
  await expect(card).toBeVisible();
  await expect(card.getByText(note)).toBeVisible();

  await card.getByRole("button", { name: "Resolve", exact: true }).click();
  await expect(card).toHaveCount(0);

  const { data, error } = await adminClient()
    .from("update_requests")
    .select("status")
    .eq("thread_id", thread.id)
    .eq("requester_id", member.id)
    .single();
  if (error) throw error;
  expect(data.status).toBe("resolved");
});
