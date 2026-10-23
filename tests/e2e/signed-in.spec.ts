import { authState, expect, hasE2eEnv, seedComment, seedThread, seededUsers, test } from "./fixtures";

test.skip(!hasE2eEnv, "needs a Supabase test project (see docs/testing.md)");

test.describe("member", () => {
  test.use({ storageState: authState("member") });

  test("is signed in", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "New thread" })).toBeVisible();
  });

  test("comments on a published thread", async ({ page }) => {
    const { slug } = await seedThread(`Commenting works ${Date.now()}`);
    await page.goto(`/t/${slug}`);
    await page.getByLabel("Add a comment").fill("Thanks, this helped a lot.");
    await page.getByRole("button", { name: "Post comment" }).click();
    await expect(page.getByText("Thanks, this helped a lot.")).toBeVisible();
  });

  test("votes on someone else's comment", async ({ page }) => {
    const { id, slug } = await seedThread(`Voting works ${Date.now()}`);
    await seedComment(id, seededUsers().moderator.id, "A comment worth voting on.");

    await page.goto(`/t/${slug}`);
    await page.getByRole("button", { name: "Upvote" }).click();
    await expect(page.getByRole("button", { name: "Upvote" })).toHaveAttribute("aria-pressed", "true");
    await page.reload();
    await expect(page.getByRole("button", { name: "Upvote" })).toHaveAttribute("aria-pressed", "true");
  });
});
