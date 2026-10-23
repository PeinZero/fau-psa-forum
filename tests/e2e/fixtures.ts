import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";
import { test as base, type Browser, type Page } from "@playwright/test";

import { AUTH_DIR, createSignedInUser, e2eEnv, type SeedRole, type SeededUser } from "./global-setup";

export type { SeededUser } from "./global-setup";

export const hasE2eEnv = e2eEnv() !== null;

/** The shared accounts from global setup; tests that change account state use newUser() instead. */
export function seededUsers(): Record<"member" | "moderator" | "superadmin", SeededUser> {
  return JSON.parse(readFileSync(`${AUTH_DIR}/users.json`, "utf8"));
}

export function authState(role: "member" | "moderator" | "superadmin") {
  return `${AUTH_DIR}/${role}.json`;
}

/** Service-role client for arranging test data; the app under test never uses it. */
export function adminClient() {
  const env = e2eEnv();
  if (!env) throw new Error("E2E env is not configured");
  return createClient(env.url, env.service, { auth: { persistSession: false } });
}

let userSeq = 0;

/** Short and unique per run, so titles and handles never collide with earlier tests. */
export function uid(): string {
  return `${Date.now().toString(36)}${(userSeq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

/**
 * A fresh signed-in user, so tests that count notifications, pending threads or change the
 * profile never see another test's state. The display name decides the generated @handle.
 */
export async function newUser(role: SeedRole = "member", name?: string): Promise<SeededUser> {
  const tag = uid();
  return createSignedInUser(adminClient(), {
    email: `e2e-${tag}@example.test`,
    name: name ?? `Tester ${tag}`,
    role,
    stateName: `user-${tag}`,
  });
}

/** A page in its own browser context signed in as `user`; closed with the test's browser. */
export async function pageAs(browser: Browser, user: SeededUser | null): Promise<Page> {
  const context = await browser.newContext(user ? { storageState: user.state } : {});
  return context.newPage();
}

async function categoryId(slug?: string): Promise<number> {
  const admin = adminClient();
  const query = admin.from("categories").select("id");
  const { data, error } = await (slug ? query.eq("slug", slug) : query.order("sort_order")).limit(1).single();
  if (error) throw error;
  return data.id;
}

type ThreadSeed = {
  body?: string;
  authorId?: string;
  status?: "pending" | "published" | "rejected" | "archived";
  category?: string;
  city?: "erlangen" | "nuremberg" | "both" | null;
};

/** A thread (published by the moderator unless told otherwise); returns its id and slug. */
export async function seedThread(title: string, seed: ThreadSeed = {}): Promise<{ id: number; slug: string }> {
  const { data, error } = await adminClient()
    .from("threads")
    .insert({
      title,
      body: seed.body ?? "Seeded by the end-to-end suite.",
      category_id: await categoryId(seed.category),
      city: seed.city ?? null,
      author_id: seed.authorId ?? seededUsers().moderator.id,
      status: seed.status ?? "published",
    })
    .select("id, slug")
    .single();
  if (error) throw error;
  return data;
}

export async function seedComment(
  threadId: number,
  authorId: string,
  body: string,
  parentId?: number,
): Promise<{ id: number }> {
  const { data, error } = await adminClient()
    .from("comments")
    .insert({ thread_id: threadId, author_id: authorId, body, parent_id: parentId ?? null })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

export async function seedReport(reporterId: string, target: { commentId: number } | { threadId: number }) {
  const { data, error } = await adminClient()
    .from("reports")
    .insert({
      reporter_id: reporterId,
      reason: "wrong_info",
      details: "Seeded report",
      ...("commentId" in target ? { comment_id: target.commentId } : { thread_id: target.threadId }),
    })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

export async function seedAnnouncement(title: string, body: string, pinned = false) {
  const { data, error } = await adminClient()
    .from("announcements")
    .insert({ title, body, is_pinned: pinned, author_id: seededUsers().moderator.id })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

/** A guide with steps in order; a step may link a thread. Returns the slug and step ids. */
export async function seedGuide(
  title: string,
  steps: { title: string; body?: string; threadId?: number }[],
  featured = false,
): Promise<{ id: number; slug: string; stepIds: number[] }> {
  const admin = adminClient();
  const slug = `e2e-${uid()}`;
  const { data: guide, error } = await admin
    .from("guides")
    .insert({ slug, title, summary: "Seeded guide", is_featured: featured, created_by: seededUsers().moderator.id })
    .select("id")
    .single();
  if (error) throw error;
  const { data: rows, error: stepError } = await admin
    .from("guide_steps")
    .insert(
      steps.map((step, i) => ({
        guide_id: guide.id,
        position: i + 1,
        title: step.title,
        body: step.body ?? null,
        thread_id: step.threadId ?? null,
      })),
    )
    .select("id, position")
    .order("position");
  if (stepError) throw stepError;
  return { id: guide.id, slug, stepIds: rows.map((r) => r.id) };
}

/** Unread notifications of one type (or all), read through the service role. */
export async function unreadNotifications(userId: string, type?: string): Promise<number> {
  let query = adminClient()
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("read_at", null);
  if (type) query = query.eq("type", type);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export const test = base;
export { expect } from "@playwright/test";
