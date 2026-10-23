import { readFileSync } from "node:fs";

import type { BrowserContext, Page } from "@playwright/test";

import {
  adminClient,
  expect,
  hasE2eEnv,
  newUser,
  pageAs,
  seedGuide,
  seedThread,
  seededUsers,
  test,
  uid,
  type SeededUser,
} from "./fixtures";

test.skip(!hasE2eEnv, "needs a Supabase test project (see docs/testing.md)");

async function doneStepIds(userId: string): Promise<number[]> {
  const { data, error } = await adminClient().from("guide_progress").select("step_id").eq("user_id", userId);
  if (error) throw error;
  return data.map((row) => row.step_id).sort((a, b) => a - b);
}

function progress(page: Page) {
  return page.getByRole("progressbar", { name: "Your progress" });
}

/** Signs `context` in as `user` without touching its local storage, like a sign-in in the same browser. */
async function signIn(context: BrowserContext, user: SeededUser) {
  const state = JSON.parse(readFileSync(user.state, "utf8")) as {
    cookies: Parameters<BrowserContext["addCookies"]>[0];
  };
  await context.addCookies(state.cookies);
}

test("moderator builds a featured guide with a linked thread and reordered steps", async ({ browser }) => {
  const tag = uid();
  const threadTitle = `Opening a blocked account with Fintiba ${tag}`;
  await seedThread(threadTitle);
  const guideTitle = `Arriving in Erlangen ${tag}`;

  const mod = await pageAs(browser, seededUsers().moderator);
  await mod.goto("/mod/guides");
  await mod.getByRole("link", { name: "New guide" }).click();
  await expect(mod.getByRole("heading", { name: "New guide" })).toBeVisible();

  await mod.getByLabel("Title", { exact: true }).fill(guideTitle);
  // The address follows the title until the moderator edits it.
  const slug = `arriving-in-erlangen-${tag}`;
  await expect(mod.getByLabel("Address", { exact: true })).toHaveValue(slug);
  await mod.getByLabel("Summary", { exact: true }).fill("The first three things to do after landing.");
  // Featured guides are ordered by sort order and only three reach the home page.
  await mod.getByLabel("Sort order", { exact: true }).fill("-1000");
  await mod.getByRole("checkbox", { name: /Feature for newcomers/ }).check();

  const stepTitles = mod.getByLabel("Step title");
  await stepTitles.nth(0).fill("Register your address");
  await mod.getByRole("button", { name: "Add step" }).click();
  await stepTitles.nth(1).fill("Open a blocked account");
  await mod.getByRole("button", { name: "Add step" }).click();
  await stepTitles.nth(2).fill("Get health insurance");
  await expect(stepTitles).toHaveCount(3);

  const picker = mod.getByRole("combobox", { name: "Linked thread for step 2" });
  await picker.fill(tag);
  await mod.getByRole("listbox", { name: "Matching threads" }).getByRole("option", { name: threadTitle }).click();
  await expect(mod.getByRole("button", { name: `Remove linked thread ${threadTitle}` })).toBeVisible();

  await mod.getByRole("button", { name: "Move step 3 up" }).click();
  await expect(stepTitles.nth(1)).toHaveValue("Get health insurance");
  await expect(stepTitles.nth(2)).toHaveValue("Open a blocked account");

  await mod.getByRole("button", { name: "Create guide" }).click();
  await expect(mod).toHaveURL(/\/mod\/guides\/\d+$/);
  await expect(mod.getByRole("heading", { name: "Edit guide" })).toBeVisible();
  await expect(stepTitles.nth(0)).toHaveValue("Register your address");
  await expect(stepTitles.nth(1)).toHaveValue("Get health insurance");
  await expect(stepTitles.nth(2)).toHaveValue("Open a blocked account");
  await expect(mod.getByRole("button", { name: `Remove linked thread ${threadTitle}` })).toBeVisible();

  const page = await pageAs(browser, await newUser());
  await page.goto(`/guides/${slug}`);
  await expect(page.getByRole("heading", { level: 1, name: guideTitle })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Step 1 done: Register your address" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Step 2 done: Get health insurance" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Step 3 done: Open a blocked account" })).toBeVisible();
  const linkedStep = page.getByRole("listitem", { name: "Open a blocked account" });
  await expect(linkedStep.getByRole("link", { name: threadTitle })).toHaveAttribute("href", /^\/t\//);

  await page.goto("/");
  const featured = page.getByRole("region", { name: "Guides for newcomers" });
  await expect(featured.getByRole("link", { name: guideTitle })).toBeVisible();
});

test("a member's ticked steps persist across reloads", async ({ browser }) => {
  const title = `Finding a flat in Nürnberg ${uid()}`;
  const guide = await seedGuide(title, [
    { title: "Search WG-Gesucht" },
    { title: "Prepare a Schufa report" },
    { title: "Sign the lease" },
  ]);
  const member = await newUser();
  const page = await pageAs(browser, member);

  await page.goto(`/guides/${guide.slug}`);
  await expect(progress(page)).toHaveAttribute("aria-valuetext", "0 of 3 done");

  const first = page.getByRole("checkbox", { name: "Step 1 done: Search WG-Gesucht" });
  await first.click();
  await expect(first).toBeChecked();
  await expect(progress(page)).toHaveAttribute("aria-valuetext", "1 of 3 done");
  await expect.poll(() => doneStepIds(member.id)).toEqual([guide.stepIds[0]]);

  await page.reload();
  await expect(first).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Step 2 done: Prepare a Schufa report" })).not.toBeChecked();
  await expect(progress(page)).toHaveAttribute("aria-valuetext", "1 of 3 done");

  await page.goto("/guides");
  await expect(page.getByRole("link", { name: title })).toContainText("1 of 3 done");
});

test("steps ticked while signed out move into the account after signing in", async ({ browser }) => {
  const guide = await seedGuide(`Applying for a residence permit ${uid()}`, [
    { title: "Book an appointment" },
    { title: "Collect the documents" },
    { title: "Pay the fee" },
  ]);
  const member = await newUser();
  const page = await pageAs(browser, null);
  const storageKey = `psa-guide-progress:${guide.id}`;
  const stored = () => page.evaluate((key) => window.localStorage.getItem(key), storageKey);

  await page.goto(`/guides/${guide.slug}`);
  await expect(page.getByText("Your progress is saved in this browser.")).toBeVisible();
  const second = page.getByRole("checkbox", { name: "Step 2 done: Collect the documents" });
  await second.click();
  await expect(second).toBeChecked();
  await expect(progress(page)).toHaveAttribute("aria-valuetext", "1 of 3 done");
  await expect.poll(stored).toBe(JSON.stringify([guide.stepIds[1]]));

  await page.reload();
  await expect(second).toBeChecked();

  await signIn(page.context(), member);
  await page.reload();
  await expect(page.getByText("Your progress is saved in this browser.")).toBeHidden();
  await expect.poll(() => doneStepIds(member.id)).toEqual([guide.stepIds[1]]);
  await expect.poll(stored).toBeNull();

  await page.reload();
  await expect(second).toBeChecked();
  await expect(progress(page)).toHaveAttribute("aria-valuetext", "1 of 3 done");
});
