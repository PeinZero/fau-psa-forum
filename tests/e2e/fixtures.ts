import { readFileSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";
import { test as base } from "@playwright/test";

import { AUTH_DIR, e2eEnv } from "./global-setup";

export const hasE2eEnv = e2eEnv() !== null;

export function seededUsers(): Record<"member" | "moderator", { id: string; username: string }> {
  return JSON.parse(readFileSync(`${AUTH_DIR}/users.json`, "utf8"));
}

export function authState(role: "member" | "moderator") {
  return `${AUTH_DIR}/${role}.json`;
}

/** Service-role client for arranging test data; the app under test never uses it. */
export function adminClient() {
  const env = e2eEnv();
  if (!env) throw new Error("E2E env is not configured");
  return createClient(env.url, env.service, { auth: { persistSession: false } });
}

/** A published thread by the moderator, so each test starts from a known page. */
export async function seedThread(title: string) {
  const admin = adminClient();
  const { data: category } = await admin.from("categories").select("id").limit(1).single();
  const { data, error } = await admin
    .from("threads")
    .insert({
      title,
      body: "Seeded by the end-to-end suite.",
      category_id: category!.id,
      author_id: seededUsers().moderator.id,
      status: "published",
    })
    .select("slug")
    .single();
  if (error) throw error;
  return data.slug;
}

export const test = base;
export { expect } from "@playwright/test";
