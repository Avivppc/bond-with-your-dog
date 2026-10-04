import { requireStaff } from "@/lib/admin";
import { loadNotificationSettings } from "@/lib/notification-settings/server";
import { PageHeader } from "../../_components/ui";
import { NotificationsEditor } from "./NotificationsEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Member notifications" };

/** Every notification members get (bell, phone, email): on/off, wording and timing. */
export default async function MemberNotificationsPage() {
  await requireStaff("content");
  const settings = await loadNotificationSettings();
  return (
    <div className="space-y-5">
      <PageHeader
        title="Member notifications"
        description="What members hear from Bonded: in the app's bell, on their phone and by email. Members can still turn types off for themselves in their Settings."
      />
      <NotificationsEditor initial={settings} />
    </div>
  );
}
