import { getUserId, getViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { NotificationBell } from "./notification-bell";

async function countUnread(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("read_at", null);
  return count ?? 0;
}

/** Header bell for signed-in visitors; reads cookies, so render it inside <Suspense>. */
export async function NotificationBellSlot() {
  const userId = await getUserId();
  if (!userId) return null;

  const [viewer, unread] = await Promise.all([getViewer(), countUnread(userId)]);
  if (!viewer) return null;

  return <NotificationBell userId={viewer.userId} initialUnread={unread} />;
}
