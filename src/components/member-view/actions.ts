"use server";

import { cookies } from "next/headers";

import { getViewer, isModerator, VIEW_AS_MEMBER_COOKIE } from "@/lib/auth/viewer";

/** Remembered per browser; setting the cookie re-renders the current page with the new view. */
export async function setMemberView(on: boolean): Promise<void> {
  const store = await cookies();
  if (!on) {
    store.delete(VIEW_AS_MEMBER_COOKIE);
    return;
  }
  const viewer = await getViewer();
  if (!viewer || !isModerator(viewer.role)) return;
  store.set(VIEW_AS_MEMBER_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
