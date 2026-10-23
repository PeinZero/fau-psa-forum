import type { Page } from "@playwright/test";

import { adminClient, expect, hasE2eEnv, newUser, pageAs, seedThread, seededUsers, test, uid } from "./fixtures";

test.skip(!hasE2eEnv, "needs a Supabase test project (see docs/testing.md)");

/** Every unreviewed revision counts, so other specs' edits are part of the expected number. */
async function unreviewedEdits(): Promise<number> {
  const { count, error } = await adminClient()
    .from("thread_revisions")
    .select("id", { count: "exact", head: true })
    .is("reviewed_at", null);
  if (error) throw error;
  return count ?? 0;
}

function recentEditsLink(page: Page) {
  return page.getByRole("navigation", { name: "Moderation sections" }).getByRole("link", { name: /^Recent edits/ });
}

function recentEditsName(count: number): RegExp {
  return count > 0 ? new RegExp(`^Recent edits\\s*${count} waiting$`) : /^Recent edits$/;
}

test("an author's edit of a published thread lands in the moderators' review queue", async ({ browser }) => {
  const member = await newUser();
  const tag = uid();
  const { id: threadId, slug } = await seedThread(`Anmeldung appointment in Erlangen ${tag}`, {
    authorId: member.id,
    body: "Book it online at the Bürgeramt.",
  });
  const editedTitle = `Anmeldung appointment in Erlangen, updated ${tag}`;

  const page = await pageAs(browser, member);
  await page.goto(`/t/${slug}/edit`);
  await expect(page.getByRole("note")).toContainText("This thread is published: your changes go live immediately");
  await page.getByLabel("Title", { exact: true }).fill(editedTitle);
  await page.getByLabel("Text", { exact: true }).fill("Book it online at the Bürgeramt; walk-ins on Thursday mornings.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(new RegExp(`/t/${slug}$`));
  await expect(page.getByRole("heading", { level: 1, name: editedTitle })).toBeVisible();

  const queued = await unreviewedEdits();
  expect(queued).toBeGreaterThan(0);

  const mod = await pageAs(browser, seededUsers().moderator);
  await mod.goto("/mod/edits");
  await expect(
    mod.getByRole("navigation", { name: "Edit review status" }).getByRole("link", { name: "To review" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(recentEditsLink(mod)).toHaveAccessibleName(recentEditsName(queued));

  const card = mod.getByRole("listitem").filter({ has: mod.getByRole("heading", { name: editedTitle }) });
  await expect(card).toContainText("Edited by");
  await expect(card).toContainText(member.displayName);
  await card.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(card).toHaveCount(0);
  await expect(recentEditsLink(mod)).toHaveAccessibleName(recentEditsName(queued - 1));

  const { data: revisions, error } = await adminClient()
    .from("thread_revisions")
    .select("reviewed_at, reviewed_by")
    .eq("thread_id", threadId);
  if (error) throw error;
  expect(revisions).toHaveLength(1);
  expect(revisions[0].reviewed_at).not.toBeNull();
  expect(revisions[0].reviewed_by).toBe(seededUsers().moderator.id);

  await mod.getByRole("navigation", { name: "Edit review status" }).getByRole("link", { name: "Reviewed" }).click();
  const reviewed = mod.getByRole("listitem").filter({ has: mod.getByRole("heading", { name: editedTitle }) });
  await expect(reviewed.getByRole("button", { name: "Mark unreviewed" })).toBeVisible();
});
