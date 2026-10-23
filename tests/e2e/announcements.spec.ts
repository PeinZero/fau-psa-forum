import { adminClient, expect, hasE2eEnv, newUser, pageAs, seededUsers, test, uid, unreadNotifications } from "./fixtures";

test.skip(!hasE2eEnv, "needs a Supabase test project (see docs/testing.md)");

async function announcementId(title: string): Promise<number> {
  const { data, error } = await adminClient().from("announcements").select("id").eq("title", title).single();
  if (error) throw error;
  return data.id;
}

async function seenSinceAnnouncement(userId: string, announcement: number): Promise<boolean> {
  const admin = adminClient();
  const [{ data: profile }, { data: row }] = await Promise.all([
    admin.from("profiles").select("announcements_seen_at").eq("id", userId).single(),
    admin.from("announcements").select("created_at").eq("id", announcement).single(),
  ]);
  return Date.parse(profile!.announcements_seen_at!) >= Date.parse(row!.created_at);
}

test("a pinned announcement reaches members as badge, notification and dismissible banner", async ({ browser, viewport }) => {
  test.skip((viewport?.width ?? 0) < 1024, "the announcements icon only shows in the header from the lg breakpoint");

  // Created first, so the announcement is newer than the member's last visit to /announcements.
  const member = await newUser();
  const title = `Iftar get-together ${uid()}`;

  const mod = await pageAs(browser, seededUsers().moderator);
  await mod.goto("/announcements");
  await mod.getByRole("link", { name: "New announcement" }).click();
  await expect(mod).toHaveURL(/\/mod\/announcements$/);

  const form = mod.getByRole("region", { name: "New announcement" });
  await form.getByLabel("Title", { exact: true }).fill(title);
  await form.getByLabel("Text", { exact: true }).fill("Join us on **Friday** at the Mensa.");
  await form.getByRole("checkbox", { name: /Pin this announcement/ }).check();
  await form.getByRole("button", { name: "Post announcement" }).click();
  await expect(form.getByText("Announcement posted. Everyone has been notified.")).toBeVisible();

  const page = await pageAs(browser, member);
  await page.goto("/");
  const megaphone = page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: /^Announcements/ });
  await expect(megaphone).toHaveAccessibleName("Announcements, 1 unread");

  const banner = page.getByRole("complementary", { name: "Announcement", exact: true });
  await expect(banner).toContainText(title);
  await expect(banner.getByRole("link", { name: title })).toBeVisible();

  await expect.poll(() => unreadNotifications(member.id, "announcement")).toBe(1);
  await page.goto("/notifications");
  await expect(page.getByRole("link", { name: `New announcement: “${title}”` })).toBeVisible();

  await page.goto("/announcements");
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  // The badge starts empty until its count loads, so wait for the visit to be stored first.
  const id = await announcementId(title);
  await expect.poll(() => seenSinceAnnouncement(member.id, id)).toBe(true);
  await expect(megaphone).toHaveAccessibleName("Announcements");

  await page.goto("/");
  await expect(banner).toContainText(title);
  await expect(megaphone).toHaveAccessibleName("Announcements");
  await banner.getByRole("button", { name: "Dismiss announcement" }).click();
  await expect(banner).toBeHidden();

  // Dismissal is remembered per browser, for the newest pinned announcement only.
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem("psa-dismissed-announcement")))
    .toBe(String(id));
  await expect(banner).toBeHidden();
});
