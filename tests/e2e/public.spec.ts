import { expect, hasE2eEnv, seedComment, seedThread, seededUsers, test, uid } from "./fixtures";

const NEEDS_DB = "needs a Supabase test project (see docs/testing.md)";

test("home page is readable without an account", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("login offers Google and an email link", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
});

test("the auth callback never redirects off-site", async ({ page }) => {
  const response = await page.request.get("/auth/callback?next=//evil.example", { maxRedirects: 0 });
  expect(new URL(response.headers().location, "http://localhost").origin).toBe("http://localhost:3000");
});

test("a category page lists its heading and city filter", async ({ page }) => {
  await page.goto("/c/first-steps");
  await expect(page.getByRole("heading", { level: 1, name: "First Steps" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Filter by city" })).toBeVisible();
});

test("the guides index loads", async ({ page }) => {
  await page.goto("/guides");
  await expect(page.getByRole("heading", { level: 1, name: "Guides" })).toBeVisible();
});

test("the theme choice survives a reload", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /^Theme: System/ });
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: /^Theme: Light/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("button", { name: /^Theme: Dark/ })).toBeVisible();
});

test.describe("seeded content", () => {
  test.skip(!hasE2eEnv, NEEDS_DB);

  test("a thread page is readable and its sign-in link returns to the thread", async ({ page }) => {
    const { slug } = await seedThread(`Public thread ${uid()}`);
    await page.goto(`/t/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Public thread");
    await expect(page.getByRole("link", { name: "Sign in to comment" })).toHaveAttribute(
      "href",
      `/login?next=/t/${slug}`,
    );
  });

  test("a category page lists a seeded thread", async ({ page }) => {
    const title = `Category listing ${uid()}`;
    const { slug } = await seedThread(title, { category: "first-steps" });
    await page.goto("/c/first-steps");
    await expect(page.locator(`a[href="/t/${slug}"]`)).toBeVisible();
  });

  test("the command palette finds threads by a partial word and opens one with the arrow keys", async ({ page }) => {
    const tag = uid();
    const old = await seedThread(`Mietvertrag Kaution ${tag} Altbau`);
    const fresh = await seedThread(`Mietvertrag Kaution ${tag} Neubau`);
    await page.goto("/");
    // Kbd hints render only after hydration, so the shortcut listener is attached by then.
    await expect(page.getByRole("button", { name: /Search threads/ }).locator("kbd").first()).toBeVisible();

    const dialog = page.getByRole("dialog", { name: "Search" });
    await expect(async () => {
      if (!(await dialog.isVisible())) await page.keyboard.press("ControlOrMeta+k");
      await expect(dialog).toBeVisible({ timeout: 1000 });
    }).toPass();

    // Lowercase and cut short: the palette matches the start of a word, not only whole words.
    await dialog.getByRole("combobox", { name: "Search threads" }).fill(`kaution ${tag.slice(0, -2)}`);
    const options = dialog.getByRole("option", { name: new RegExp(`Mietvertrag Kaution ${tag}`) });
    await expect(options).toHaveCount(2);
    await expect(options.first()).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("ArrowDown");
    await expect(options.first()).toHaveAttribute("aria-selected", "false");
    await expect(options.nth(1)).toHaveAttribute("aria-selected", "true");
    const second = (await options.nth(1).textContent()) ?? "";
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(`/t/${second.includes("Neubau") ? fresh.slug : old.slug}`);
  });

  test("search tolerates a typo in the title", async ({ page }) => {
    const tag = uid();
    const { slug } = await seedThread(`Zulassungsbescheid ${tag}`);
    await page.goto("/search?q=Zulassungsbscheid");
    await expect(page.locator(`a[href="/t/${slug}"]`)).toBeVisible();
  });

  test("search filters by category and city", async ({ page }) => {
    const word = `Quokka${uid()}`;
    const erlangen = await seedThread(`${word} Konto`, { category: "first-steps", city: "erlangen" });
    const nuremberg = await seedThread(`${word} Zimmer`, { category: "accommodation", city: "nuremberg" });
    const link = (slug: string) => page.locator(`a[href="/t/${slug}"]`);

    await page.goto(`/search?q=${word}`);
    await expect(link(erlangen.slug)).toBeVisible();
    await expect(link(nuremberg.slug)).toBeVisible();

    await page.getByLabel("Category").selectOption("first-steps");
    await expect(page).toHaveURL(/category=first-steps/);
    await expect(link(erlangen.slug)).toBeVisible();
    await expect(link(nuremberg.slug)).toHaveCount(0);

    await page.getByRole("button", { name: "Clear filters" }).click();
    await expect(link(nuremberg.slug)).toBeVisible();
    await page.getByRole("group", { name: "City" }).getByRole("button", { name: "Nuremberg" }).click();
    await expect(page).toHaveURL(/city=nuremberg/);
    await expect(link(nuremberg.slug)).toBeVisible();
    await expect(link(erlangen.slug)).toHaveCount(0);
  });

  test("search sorts by newest and by most comments", async ({ page }) => {
    const word = `Narwhal${uid()}`;
    const older = await seedThread(`${word} older`);
    await seedThread(`${word} newer`);
    const author = seededUsers().moderator.id;
    await seedComment(older.id, author, "First answer.");
    await seedComment(older.id, author, "Second answer.");

    const titles = page.getByRole("heading", { level: 3 });
    await page.goto(`/search?q=${word}`);
    await page.getByRole("group", { name: "Sort by" }).getByRole("button", { name: "Newest" }).click();
    await expect(page).toHaveURL(/sort=newest/);
    await expect(titles).toHaveText([`${word} newer`, `${word} older`]);

    await page.getByRole("group", { name: "Sort by" }).getByRole("button", { name: "Top" }).click();
    await expect(page).toHaveURL(/sort=top/);
    await expect(titles).toHaveText([`${word} older`, `${word} newer`]);
  });
});
