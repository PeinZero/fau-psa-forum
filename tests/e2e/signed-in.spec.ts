import { adminClient, authState, expect, hasE2eEnv, seedThread, seededUsers, test } from "./fixtures";

test.skip(!hasE2eEnv, "needs a Supabase test project (see docs/testing.md)");

test.describe("member", () => {
  test.use({ storageState: authState("member") });

  test("is signed in", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "New thread" })).toBeVisible();
  });

  test("comments on a published thread", async ({ page }) => {
    const slug = await seedThread(`Commenting works ${Date.now()}`);
    await page.goto(`/t/${slug}`);
    await page.getByLabel("Add a comment").fill("Thanks, this helped a lot.");
    await page.getByRole("button", { name: "Post comment" }).click();
    await expect(page.getByText("Thanks, this helped a lot.")).toBeVisible();
  });

  test("votes on someone else's comment", async ({ page }) => {
    const slug = await seedThread(`Voting works ${Date.now()}`);
    const admin = adminClient();
    const { data: thread } = await admin.from("threads").select("id").eq("slug", slug).single();
    await admin
      .from("comments")
      .insert({ thread_id: thread!.id, author_id: seededUsers().moderator.id, body: "A comment worth voting on." });

    await page.goto(`/t/${slug}`);
    await page.getByRole("button", { name: "Upvote" }).click();
    await expect(page.getByRole("button", { name: "Upvote" })).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(page.getByRole("button", { name: "Upvote" })).toHaveAttribute("aria-pressed", "true");
  });
});
