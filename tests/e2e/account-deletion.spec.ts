import { adminClient, expect, hasE2eEnv, newUser, pageAs, seedComment, seedThread, test, uid } from "./fixtures";

test.skip(!hasE2eEnv, "needs a Supabase test project (see docs/testing.md)");

test("a member deletes their account; their comment stays as Deleted user", async ({ browser }) => {
  const member = await newUser();
  const thread = await seedThread(`Account deletion ${uid()}`);
  const body = `Leaving the forum soon ${uid()}`;
  const comment = await seedComment(thread.id, member.id, body);
  const page = await pageAs(browser, member);

  await page.goto("/account");
  await page.getByRole("button", { name: "Delete account", exact: true }).click();
  const confirm = page.getByRole("button", { name: "Delete my account", exact: true });
  await expect(confirm).toBeDisabled();
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await confirm.click();

  await expect(page).toHaveURL(/\/\?deleted=1$/);
  const notice = page.getByRole("status").filter({ hasText: "Your account was deleted." });
  await expect(notice).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();

  await notice.getByRole("button", { name: "Dismiss notice" }).click();
  await expect(notice).toHaveCount(0);
  await expect(page).not.toHaveURL(/deleted=/);

  const admin = adminClient();
  const { data: profile } = await admin.from("profiles").select("id").eq("id", member.id).maybeSingle();
  expect(profile).toBeNull();
  const { data: kept } = await admin.from("comments").select("author_id, body").eq("id", comment.id).single();
  expect(kept).toEqual({ author_id: null, body });

  await page.goto(`/t/${thread.slug}`);
  const item = page.getByRole("listitem").filter({ hasText: body });
  await expect(item).toBeVisible();
  await expect(item.getByText("Deleted user", { exact: true })).toBeVisible();
});
