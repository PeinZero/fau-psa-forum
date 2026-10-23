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

const PENDING_LIMIT_MESSAGE =
  "You already have 3 threads waiting for review. Please wait until a moderator reviews one of them before submitting another.";

async function pendingCount(authorId: string): Promise<number> {
  const { count, error } = await adminClient()
    .from("threads")
    .select("id", { count: "exact", head: true })
    .eq("author_id", authorId)
    .eq("status", "pending");
  if (error) throw error;
  return count ?? 0;
}

test("suggests similar threads while the title is typed", async ({ browser }) => {
  const tag = uid();
  const existing = `Blocked account renewal ${tag} explained step by step`;
  await seedThread(existing);

  const page = await pageAs(browser, await newUser());
  await page.goto("/new");
  await page.getByLabel("Title", { exact: true }).pressSequentially(`Blocked account renewal ${tag}`);

  const similar = page.getByRole("region", { name: "Similar threads" });
  await expect(similar).toBeVisible();
  await expect(similar.getByRole("link", { name: existing })).toBeVisible();
  await expect(page.getByText("Your question may already be answered. Check these first.")).toBeVisible();
});

test("submits a thread and lands on it while it waits for review", async ({ browser }) => {
  const member = await newUser();
  const title = `Where to buy a Deutschlandticket ${uid()}`;
  const page = await pageAs(browser, member);

  await page.goto("/new");
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByLabel("Category").selectOption({ label: "First Steps" });
  await page.getByLabel("City (optional)").selectOption({ label: "Erlangen" });
  await page.getByLabel("Text", { exact: true }).fill("Is the student ticket enough, or do I need the Deutschlandticket?");
  await page.getByRole("button", { name: "Submit for review" }).click();

  await expect(page).toHaveURL(/\/t\/[^/]+$/);
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Waiting for review" })).toBeVisible();
  await expect(page.getByText("Only you and the moderators can see this thread until it is approved.")).toBeVisible();

  const { data, error } = await adminClient()
    .from("threads")
    .select("status, city, category:categories!threads_category_id_fkey(slug)")
    .eq("author_id", member.id)
    .eq("title", title)
    .single();
  if (error) throw error;
  expect(data).toMatchObject({ status: "pending", city: "erlangen", category: { slug: "first-steps" } });
});

test("blocks a fourth thread while three are waiting for review", async ({ browser }) => {
  const member = await newUser();
  for (let i = 1; i <= 3; i++) {
    await seedThread(`Waiting thread number ${i} ${uid()}`, { authorId: member.id, status: "pending" });
  }

  const page = await pageAs(browser, member);
  await page.goto("/new");
  await page.getByLabel("Title", { exact: true }).fill(`One thread too many ${uid()}`);
  await page.getByLabel("Category").selectOption({ label: "Other" });
  await page.getByLabel("Text", { exact: true }).fill("This one should wait until a moderator reviewed the others.");
  await page.getByRole("button", { name: "Submit for review" }).click();

  await expect(page.getByRole("alert").filter({ hasText: PENDING_LIMIT_MESSAGE })).toBeVisible();
  await expect(page).toHaveURL(/\/new$/);
  expect(await pendingCount(member.id)).toBe(3);
});

test("moderators see possible duplicates on a pending thread", async ({ browser }) => {
  const tag = uid();
  const published = `Library card registration ${tag} at the university library`;
  const pending = `Library card registration ${tag}`;
  await seedThread(published);
  const author = await newUser();
  await seedThread(pending, { authorId: author.id, status: "pending" });

  const page = await pageAs(browser, seededUsers().moderator);
  await page.goto("/mod/threads");

  const card = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: pending, exact: true }) });
  const duplicates = card.getByRole("region", { name: "Possible duplicates" });
  await expect(duplicates).toBeVisible();
  await expect(duplicates.getByRole("link", { name: published })).toBeVisible();
  await expect(duplicates.getByRole("button", { name: `Copy rejection reason linking to ${published}` })).toBeVisible();
});
