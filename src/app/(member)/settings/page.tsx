import { requireMember } from "@/lib/member/viewer";
import { createClient } from "@/lib/supabase/server";
import { NOTIF_PREFS, readNotifPrefs } from "@/lib/feedback/prefs";
import { timeZoneOptions } from "@/lib/reminders/timezone-input";
import { SwitchRow } from "./SwitchRow";
import { TimeZoneRow } from "./TimeZoneRow";
import { SignInCard } from "./SignInCard";
import { DataCard } from "./DataCard";
import { PhoneNotificationsCard } from "./PhoneNotificationsCard";
import { pushConfig } from "@/lib/push/server";

export const metadata = { title: "Settings & privacy" };

export default async function SettingsPage() {
  const viewer = await requireMember("/settings");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const providers = new Set((user?.identities ?? []).map((i) => i.provider));
  const prefs = readNotifPrefs(viewer.profile.notif_prefs);

  return (
    <>
      <div className="head-block">
        <span className="eyebrow">Settings</span>
        <h1 className="h1">Settings &amp; privacy</h1>
      </div>
      <div className="grid-2">
        <div className="card">
          <h2 className="h3">Notifications</h2>
          <div className="list">
            {NOTIF_PREFS.map((p) => (
              <SwitchRow key={p.key} prefKey={p.key} label={p.label} hint={p.hint} initial={prefs[p.key]} />
            ))}
            <SwitchRow prefKey="newsletter" label="Bonded newsletter" hint="Tips and news, about twice a month" initial={viewer.profile.marketing_opt_in} />
            <TimeZoneRow initial={viewer.profile.timezone} options={timeZoneOptions(viewer.profile.timezone)} />
          </div>
        </div>
        <div className="stack-lg">
          <PhoneNotificationsCard publicKey={pushConfig()?.publicKey ?? null} />
          <SignInCard email={viewer.email} hasGoogle={providers.has("google")} hasPassword={providers.has("email")} />
          <DataCard />
        </div>
      </div>
    </>
  );
}
