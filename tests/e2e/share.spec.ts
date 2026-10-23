import { expect, hasE2eEnv, seedThread, test, uid } from "./fixtures";

test.skip(!hasE2eEnv, "needs a Supabase test project (see docs/testing.md)");

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

test("Share copies the thread link when the browser has no share sheet", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
  });
  const { slug } = await seedThread(`Share me ${uid()}`);
  await page.goto(`/t/${slug}`);

  await page.getByRole("button", { name: "Share" }).click();
  await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(`/t/${slug}`);
});

test("? opens the keyboard shortcuts and Escape closes them", async ({ page }) => {
  const { slug } = await seedThread(`Shortcuts ${uid()}`);
  await page.goto(`/t/${slug}`);
  await expect(page.getByRole("button", { name: /^Theme:/ })).toBeVisible();

  const dialog = page.getByRole("dialog", { name: "Keyboard shortcuts" });
  await expect(async () => {
    if (!(await dialog.isVisible())) await page.keyboard.press("?");
    await expect(dialog).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(dialog.getByText("Open search")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
