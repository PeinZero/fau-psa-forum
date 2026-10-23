import { expect, test } from "@playwright/test";

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
