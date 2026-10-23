import type { Locator, Page } from "@playwright/test";

import {
  adminClient,
  expect,
  hasE2eEnv,
  newUser,
  pageAs,
  seedThread,
  seededUsers,
  test,
  uid,
} from "./fixtures";

test.skip(!hasE2eEnv, "needs a Supabase test project (see docs/testing.md)");

/**
 * Opens `path` and resolves once the header bell's Realtime channel confirmed its Postgres
 * subscription, so an insert after this point must arrive live.
 */
async function openWithLiveBell(page: Page, path: string, userId: string) {
  const frames: string[] = [];
  page.on("websocket", (socket) => {
    if (!socket.url().includes("/realtime/v1/websocket")) return;
    socket.on("framereceived", ({ payload }) => {
      frames.push(typeof payload === "string" ? payload : payload.toString("utf8"));
    });
  });
  await page.goto(path);
  await expect
    .poll(
      () =>
        frames.some(
          (frame) =>
            frame.includes(`notifications:${userId}:`) &&
            frame.includes('"system"') &&
            frame.includes("postgres_changes") &&
            frame.includes('"ok"'),
        ),
      { timeout: 15_000, message: "the bell never subscribed to its notifications" },
    )
    .toBe(true);
}

/** Clicks a menu trigger until its menu shows: a click that lands before hydration opens nothing. */
async function openMenu(trigger: Locator, menu: Locator) {
  await expect(async () => {
    if ((await trigger.getAttribute("aria-expanded")) !== "true") await trigger.click();
    await expect(menu).toBeVisible({ timeout: 1_000 });
  }).toPass();
  return menu;
}

async function threadMenu(page: Page) {
  return openMenu(
    page.getByRole("button", { name: "Thread actions" }),
    page.getByRole("menu", { name: "Thread actions" }),
  );
}

async function threadMenuItem(page: Page, label: string) {
  const menu = await threadMenu(page);
  return menu.getByRole("menuitem", { name: label, exact: true });
}

const verifiedBadge = (page: Page) => page.getByTitle("Checked by moderators");

test("approving a thread updates the author's bell without a reload", async ({ browser }) => {
  const member = await newUser();
  const title = `Approve me live ${uid()}`;
  const { slug } = await seedThread(title, { authorId: member.id, status: "pending" });

  const memberPage = await pageAs(browser, member);
  await openWithLiveBell(memberPage, `/t/${slug}`, member.id);
  await expect(memberPage.getByRole("link", { name: "Notifications", exact: true })).toBeVisible();

  const modPage = await pageAs(browser, seededUsers().moderator);
  await modPage.goto("/mod/threads");
  const card = modPage.getByRole("listitem").filter({ has: modPage.getByRole("link", { name: title, exact: true }) });
  await card.getByRole("button", { name: "Approve" }).click();
  await expect(card).toHaveCount(0);

  await expect(memberPage.getByRole("link", { name: "Notifications, 1 unread" })).toBeVisible({ timeout: 15_000 });
  // Still the server render from before the approval, so the count can only have come in live.
  await expect(memberPage.getByText("Only you and the moderators can see this thread until it is approved.")).toBeVisible();
});

test("a rejection reason reaches the author's thread list", async ({ browser }) => {
  const member = await newUser();
  const title = `Reject me with a reason ${uid()}`;
  const reason = `Already answered elsewhere ${uid()}`;
  const { slug } = await seedThread(title, { authorId: member.id, status: "pending" });

  const modPage = await pageAs(browser, seededUsers().moderator);
  await modPage.goto(`/t/${slug}`);
  await (await threadMenuItem(modPage, "Reject")).click();
  const dialog = modPage.getByRole("dialog", { name: "Reject" });
  await dialog.getByLabel("Reason for rejection").fill(reason);
  await dialog.getByRole("button", { name: "Reject thread" }).click();
  await expect(modPage.getByRole("status").filter({ hasText: `Reason: ${reason}` })).toBeVisible();

  const memberPage = await pageAs(browser, member);
  await memberPage.goto("/account");
  const row = memberPage.getByRole("listitem").filter({ has: memberPage.getByRole("link", { name: title }) });
  await expect(row).toContainText("Rejected");
  await expect(row.getByText(`Reason: ${reason}`)).toBeVisible();
});

test.describe("thread menu as a moderator", () => {
  test("pins a thread", async ({ browser }) => {
    const { slug } = await seedThread(`Pin this thread ${uid()}`);
    const page = await pageAs(browser, seededUsers().moderator);
    await page.goto(`/t/${slug}`);

    await expect(page.getByText("Pinned", { exact: true })).toHaveCount(0);
    await (await threadMenuItem(page, "Pin")).click();
    await expect(page.getByText("Pinned", { exact: true })).toBeVisible();
    await expect((await threadMenu(page)).getByRole("menuitem", { name: "Unpin", exact: true })).toBeVisible();
  });

  test("marks a thread outdated", async ({ browser }) => {
    const { slug } = await seedThread(`Outdated thread ${uid()}`);
    const page = await pageAs(browser, seededUsers().moderator);
    await page.goto(`/t/${slug}`);

    await (await threadMenuItem(page, "Mark outdated")).click();
    const banner = page.getByRole("status").filter({ hasText: "Marked as outdated" });
    await expect(banner).toContainText("A moderator flagged that parts of this thread may no longer be correct.");
    await expect(page.getByText("Outdated", { exact: true })).toBeVisible();
  });

  test("archives a thread", async ({ browser }) => {
    const { slug } = await seedThread(`Archive this thread ${uid()}`);
    const page = await pageAs(browser, seededUsers().moderator);
    await page.goto(`/t/${slug}`);

    await (await threadMenuItem(page, "Archive")).click();
    const dialog = page.getByRole("dialog", { name: "Archive" });
    await expect(dialog).toContainText("Archived threads become read-only and disappear from lists.");
    await dialog.getByRole("button", { name: "Archive", exact: true }).click();
    await expect(page.getByText("This thread is read-only and no longer listed.")).toBeVisible();
    await expect((await threadMenu(page)).getByRole("menuitem", { name: "Unarchive", exact: true })).toBeVisible();
  });
});

test("an author's edit removes the verified badge", async ({ browser }) => {
  const member = await newUser();
  const { slug } = await seedThread(`Still accurate thread ${uid()}`, { authorId: member.id });

  const modPage = await pageAs(browser, seededUsers().moderator);
  await modPage.goto(`/t/${slug}`);
  await expect(verifiedBadge(modPage)).toHaveCount(0);
  await (await threadMenuItem(modPage, "Mark as still accurate")).click();
  await expect(verifiedBadge(modPage)).toContainText("Verified");

  const memberPage = await pageAs(browser, member);
  await memberPage.goto(`/t/${slug}`);
  await expect(verifiedBadge(memberPage)).toBeVisible();

  const newBody = `The office moved, so this is the updated address ${uid()}.`;
  await memberPage.goto(`/t/${slug}/edit`);
  await memberPage.getByLabel("Text", { exact: true }).fill(newBody);
  await memberPage.getByRole("button", { name: "Save changes" }).click();
  await expect(memberPage).toHaveURL(new RegExp(`/t/${slug}$`));
  await expect(memberPage.getByText(newBody)).toBeVisible();
  await expect(verifiedBadge(memberPage)).toHaveCount(0);
});

test("view as member hides the moderator controls until switching back", async ({ browser }) => {
  const { slug } = await seedThread(`View as member ${uid()}`);
  const page = await pageAs(browser, await newUser("moderator"));
  await page.goto(`/t/${slug}`);

  await expect((await threadMenu(page)).getByRole("menuitem", { name: "Pin", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");

  const accountMenu = await openMenu(
    page.getByRole("button", { name: /^Account menu: / }),
    page.getByRole("menu", { name: /^Account menu: / }),
  );
  await accountMenu.getByRole("menuitemcheckbox", { name: "View as member" }).click();
  const switchBack = page.getByRole("button", { name: "Switch back" });
  await expect(switchBack).toBeVisible();
  await expect(page.getByRole("button", { name: /, viewing as a member$/ })).toBeVisible();

  const memberMenu = await threadMenu(page);
  await expect(memberMenu.getByRole("menuitem", { name: "Report", exact: true })).toBeVisible();
  await expect(memberMenu.getByRole("menuitem", { name: "Pin", exact: true })).toHaveCount(0);
  await expect(memberMenu.getByRole("menuitem", { name: "Archive", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");

  await switchBack.click();
  await expect(switchBack).toHaveCount(0);
  await expect((await threadMenu(page)).getByRole("menuitem", { name: "Pin", exact: true })).toBeVisible();
});

test("a superadmin's role change shows on the user row right away", async ({ browser }) => {
  const target = await newUser();
  const page = await pageAs(browser, seededUsers().superadmin);
  await page.goto(`/mod/users?q=${encodeURIComponent(target.displayName)}`);

  const row = page.getByRole("listitem").filter({ hasText: target.displayName });
  const roleBadge = row.locator("span", { hasText: /^Moderator$/ });
  const select = row.getByLabel(`Role of ${target.displayName}`);
  await expect(select).toHaveValue("member");
  await expect(roleBadge).toHaveCount(0);

  const changeRole = row.getByRole("button", { name: "Change role" });
  // Repeated until the hydrated form reacts to the change.
  await expect(async () => {
    await select.selectOption("moderator");
    await expect(changeRole).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await changeRole.click();
  await expect(row.getByText(`Change ${target.displayName} from member to moderator?`)).toBeVisible();
  await row.getByRole("button", { name: "Confirm" }).click();

  await expect(row.getByRole("status")).toHaveText("Role updated.");
  await expect(roleBadge).toBeVisible();
  await expect(select).toHaveValue("moderator");
  await expect(row.getByRole("button", { name: "Confirm" })).toHaveCount(0);
  await expect(changeRole).toHaveCount(0);

  const { data, error } = await adminClient().from("profiles").select("role").eq("id", target.id).single();
  if (error) throw error;
  expect(data.role).toBe("moderator");
});
