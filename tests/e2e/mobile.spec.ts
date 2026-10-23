import type { Page } from "@playwright/test";

import { authState, expect, hasE2eEnv, seedThread, test, uid } from "./fixtures";

const NEEDS_DB = "needs a Supabase test project (see docs/testing.md)";

test.use({ viewport: { width: 390, height: 844 } });

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

async function visit(page: Page, path: string, heading: string | RegExp) {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  await expectNoHorizontalScroll(page);
}

test.describe("public pages at 390px", () => {
  test("home", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test("category", async ({ page }) => visit(page, "/c/first-steps", "First Steps"));
  test("guides", async ({ page }) => visit(page, "/guides", "Guides"));
  test("announcements", async ({ page }) => visit(page, "/announcements", "Announcements"));
  test("login", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
  test("empty search", async ({ page }) => visit(page, "/search", "Search"));
});

test.describe("seeded pages at 390px", () => {
  test.skip(!hasE2eEnv, NEEDS_DB);

  test("thread with a long title", async ({ page }) => {
    const title = `Overflow check ${uid()} Wie melde ich mich in Erlangen an und was brauche ich für die Anmeldung beim Bürgeramt`;
    const { slug } = await seedThread(title);
    await visit(page, `/t/${slug}`, title);
  });

  test("search results", async ({ page }) => {
    const tag = uid();
    const title = `Wohnungssuche Erlangen Nuremberg commute ${tag}`;
    await seedThread(title);
    await page.goto(`/search?q=${tag}`);
    await expect(page.getByRole("link", { name: title })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test.describe("member", () => {
    test.use({ storageState: authState("member") });

    test("account", async ({ page }) => {
      await page.goto("/account");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoHorizontalScroll(page);
    });
    test("saved", async ({ page }) => visit(page, "/saved", "Saved"));
    test("notifications", async ({ page }) => visit(page, "/notifications", "Notifications"));
  });

  test.describe("moderator", () => {
    test.use({ storageState: authState("moderator") });

    test("mod queue", async ({ page }) => {
      await page.goto("/mod");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoHorizontalScroll(page);
    });
  });
});
