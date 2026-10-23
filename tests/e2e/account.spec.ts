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

test("member changes display name, handle and affiliation; reserved and taken handles are rejected", async ({
  browser,
}) => {
  const member = await newUser();
  const other = await newUser();
  const page = await pageAs(browser, member);
  const tag = uid();
  const displayName = `Renamed ${tag}`;
  const handle = `e2e_${tag}`;

  await page.goto("/account");
  const username = page.getByLabel("Username", { exact: true });
  const save = page.getByRole("button", { name: "Save profile" });
  await expect(username).toHaveValue(member.username);

  // Contains a staff word, so only the database trigger catches it, not the exact-match list in the action.
  await username.fill("fau_admin");
  await save.click();
  await expect(page.getByText("That username is reserved.")).toBeVisible();
  await expect(username).toHaveAttribute("aria-invalid", "true");

  await username.fill(other.username);
  await save.click();
  await expect(page.getByText("That username is taken.")).toBeVisible();

  await username.fill("admin");
  await save.click();
  await expect(page.getByText("That username is reserved.")).toBeVisible();

  await page.getByLabel("Display name", { exact: true }).fill(displayName);
  await username.fill(handle);
  await page.getByLabel("Affiliation", { exact: true }).selectOption("student");
  await save.click();
  await expect(page.getByText("Profile saved.")).toBeVisible();
  await expect(username).not.toHaveAttribute("aria-invalid");
  await expect(page.getByRole("heading", { level: 1, name: displayName })).toBeVisible();
  await expect(page.getByRole("link", { name: `/u/${handle}` })).toBeVisible();

  const { data: profile } = await adminClient()
    .from("profiles")
    .select("display_name, username, affiliation")
    .eq("id", member.id)
    .single();
  expect(profile).toEqual({ display_name: displayName, username: handle, affiliation: "student" });

  await page.reload();
  await expect(username).toHaveValue(handle);
  await expect(page.getByLabel("Affiliation", { exact: true })).toHaveValue("student");

  await page.goto(`/u/${handle}`);
  await expect(page.getByRole("heading", { level: 1, name: displayName })).toBeVisible();
  await expect(page.getByText(`@${handle}`, { exact: true })).toBeVisible();
  await expect(page.getByText("Student", { exact: true })).toBeVisible();
});

test("muting one notification type drops only that type", async ({ browser }) => {
  const member = await newUser();
  const commenter = await newUser();
  const page = await pageAs(browser, member);

  await page.goto("/account/notifications");
  const threadComments = page.getByRole("switch", { name: "Comments on your threads" });
  await expect(threadComments).toHaveAttribute("aria-checked", "true");
  await threadComments.click();
  await expect(threadComments).toHaveAttribute("aria-checked", "false");
  await expect(page.getByRole("status").filter({ hasText: /^Saved$/ })).toBeVisible();

  await page.reload();
  await expect(threadComments).toHaveAttribute("aria-checked", "false");
  await expect(page.getByRole("switch", { name: "Mentions", exact: true })).toHaveAttribute("aria-checked", "true");

  const own = await seedThread(`Muted comments ${uid()}`, { authorId: member.id });
  await seedComment(own.id, commenter.id, "A comment on a thread whose author muted these.");
  expect(await unreadNotifications(member.id, "thread_comment")).toBe(0);
  // Authors follow their own threads; with thread_comment muted the comment falls through to the
  // next type the author still wants.
  expect(await unreadNotifications(member.id, "followed_thread_activity")).toBe(1);

  const elsewhere = await seedThread(`Unmuted mentions ${uid()}`);
  await seedComment(elsewhere.id, commenter.id, `Ask @${member.username} about this.`);
  expect(await unreadNotifications(member.id, "mention")).toBe(1);
});
