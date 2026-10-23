import { mkdirSync, writeFileSync } from "node:fs";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export const AUTH_DIR = "tests/e2e/.auth";
export const PASSWORD = "e2e-password-not-a-secret";

type Seed = { key: "member" | "moderator"; email: string; name: string };
const SEEDS: Seed[] = [
  { key: "member", email: "e2e-member@example.test", name: "E2E Member" },
  { key: "moderator", email: "e2e-moderator@example.test", name: "E2E Moderator" },
];

export function e2eEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const service = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) return null;
  return { url, anon, service };
}

/**
 * Seeds a member and a moderator in the test Supabase project and stores a signed-in browser state
 * for each. Password sign-in exists only here; the app itself offers Google and magic links.
 * Without the env the signed-in specs skip themselves and only the public smoke tests run.
 */
export default async function globalSetup() {
  const env = e2eEnv();
  if (!env) return;
  mkdirSync(AUTH_DIR, { recursive: true });

  const admin = createClient(env.url, env.service, { auth: { persistSession: false } });
  const users: Record<string, { id: string; username: string }> = {};

  for (const seed of SEEDS) {
    const created = await admin.auth.admin.createUser({
      email: seed.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: seed.name },
    });
    let id = created.data.user?.id;
    if (!id) {
      const list = await admin.auth.admin.listUsers({ perPage: 200 });
      id = list.data.users.find((u) => u.email === seed.email)?.id;
    }
    if (!id) throw new Error(`Could not create or find ${seed.email}: ${created.error?.message}`);

    // The service role is trusted by the role guard trigger, so this bypasses set_user_role().
    const role = seed.key === "moderator" ? "moderator" : "member";
    const { error } = await admin.from("profiles").update({ role }).eq("id", id);
    if (error) throw error;
    const { data: profile } = await admin.from("profiles").select("username").eq("id", id).single();
    users[seed.key] = { id, username: profile!.username };

    // @supabase/ssr decides the cookie names, encoding and chunking, so let it write them.
    let cookies: { name: string; value: string }[] = [];
    const ssr = createServerClient(env.url, env.anon, {
      cookies: { getAll: () => [], setAll: (set) => void (cookies = set) },
    });
    const { error: signInError } = await ssr.auth.signInWithPassword({ email: seed.email, password: PASSWORD });
    if (signInError) throw signInError;
    writeFileSync(
      `${AUTH_DIR}/${seed.key}.json`,
      JSON.stringify({
        cookies: cookies.map((c) => ({
          name: c.name,
          value: c.value,
          domain: "localhost",
          path: "/",
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: "Lax",
        })),
        origins: [],
      }),
    );
  }

  writeFileSync(`${AUTH_DIR}/users.json`, JSON.stringify(users));
}
