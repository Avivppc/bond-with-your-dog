import Link from "next/link";
import { requireMember } from "@/lib/member/viewer";
import { createClient } from "@/lib/supabase/server";
import { StateCard } from "@/components/app/ui";
import { NotificationInbox, type InboxItem } from "./NotificationInbox";

export const metadata = { title: "Notifications" };

const LIMIT = 100;

export default async function NotificationsPage() {
  await requireMember("/notifications");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, kind, title, body, href, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(LIMIT);
  if (error) console.error("[notifications] load failed", error.message);
  const items = (data ?? []) as InboxItem[];

  if (items.length === 0) {
    return (
      <>
        <div className="head-block">
          <span className="eyebrow">Inbox</span>
          <h1 className="h1">Notifications</h1>
        </div>
        <StateCard
          icon="notifications"
          tone="teal"
          eyebrow="All quiet"
          title="No notifications yet"
          action={
            <Link className="btn btn-ghost btn-sm" href="/feedback/new">
              Send Roni a video
            </Link>
          }
        >
          Roni&apos;s replies, answers to your questions and new achievements will show up here.
        </StateCard>
      </>
    );
  }

  return <NotificationInbox items={items} nowIso={new Date().toISOString()} />;
}
