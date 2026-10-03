import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { loadEmailSettings } from "@/lib/flows/server/email-settings";
import { NOTIFY_EVENTS, NOTIFY_INFO, teamRecipient } from "@/lib/notifications";
import { BTN_PRIMARY, Card, INPUT, LABEL, MUTED, Notice, PageHeader } from "../../_components/ui";
import { saveNotificationSettings } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notification settings" };

/** Which events email the team, and where those emails go. */
export default async function NotificationSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireStaff("sales");
  const { saved, error } = await searchParams;
  const settings = await loadEmailSettings(createServiceClient());
  const fallback = process.env.COACH_INBOX?.trim() || null;
  const recipient = teamRecipient(settings.teamEmail, process.env.COACH_INBOX);

  return (
    <>
      <PageHeader title="Notifications" description="Get an email when something needs the team. Everything also shows on the dashboard and the bell." />
      {saved && <Notice tone="success">Notification settings saved.</Notice>}
      {typeof error === "string" && <Notice tone="error">{error}</Notice>}
      {!recipient && <Notice tone="error">Add a team email below. Until then no notification emails go out.</Notice>}

      <form action={saveNotificationSettings} className="space-y-6">
        <Card title="Send to" description="One address. Use a shared inbox or a forwarding address to reach several people.">
          <label className="flex max-w-xl flex-col gap-1.5">
            <span className={LABEL}>Team email</span>
            <input name="team_email" type="email" className={INPUT} maxLength={200} defaultValue={settings.teamEmail ?? ""} placeholder={fallback ?? "team@bonded.dog"} />
            <span className={`text-[12px] ${MUTED}`}>
              {fallback && !settings.teamEmail ? `Empty: emails go to ${fallback} (set in Vercel).` : "Also where \"Notify the team\" steps in email flows send their note."}
            </span>
          </label>
        </Card>

        <Card flush title="Email me when" description="Turn off anything you'd rather check on the dashboard.">
          <ul className="divide-y divide-[#efeeed] border-t border-[#efeeed]">
            {NOTIFY_EVENTS.map((event) => (
              <li key={event}>
                <label className="flex cursor-pointer items-start gap-3 px-5 py-4 hover:bg-[#fafaf9]">
                  <input
                    type="checkbox"
                    name={`notify_${event}`}
                    defaultChecked={settings.notify[event]}
                    className="mt-0.5 h-4 w-4 accent-[#343332]"
                  />
                  <span>
                    <span className="block text-[14px] font-medium text-[#1a1a19]">{NOTIFY_INFO[event].label}</span>
                    <span className={`block text-[12px] ${MUTED}`}>{NOTIFY_INFO[event].hint}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </Card>

        <p className={`text-[12px] ${MUTED}`}>Videos waiting more than a few days also get a daily reminder email, whatever you choose here.</p>

        <div>
          <button type="submit" className={BTN_PRIMARY}>
            Save
          </button>
        </div>
      </form>
    </>
  );
}
