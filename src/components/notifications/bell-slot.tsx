import { getViewer } from "@/lib/auth/viewer";
import { createClient } from "@/lib/supabase/server";
import { NotificationBell } from "./notification-bell";

/** Header bell for signed-in visitors; reads cookies, so render it inside <Suspense>. */
export async function NotificationBellSlot() {
  const viewer = await getViewer();
  if (!viewer) return null;

  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", viewer.userId)
    .is("read_at", null);

  return <NotificationBell userId={viewer.userId} initialUnread={count ?? 0} />;
}
