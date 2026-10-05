import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { loadEmailSettings } from "@/lib/flows/server/email-settings";
import { fromWithName } from "@/lib/flows/sender";
import { BTN_PRIMARY, Card, INPUT, LABEL, MUTED, Notice, PageHeader } from "../../_components/ui";
import { EMAIL_ART_KINDS, EMAIL_ART_LABELS, type EmailArtSettings } from "@/lib/email-art";
import { saveEmailArt, saveEmailSettings } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Email settings" };

const ART_ROWS: { field: string; key: keyof EmailArtSettings; label: string; hint: string }[] = [
  { field: "art_member", key: "member", label: "Reminders and updates", hint: "Practice reminders, feedback replies and quiz results: emails members get often." },
  { field: "art_system", key: "system", label: "Account and receipt emails", hint: "Sign-in and password links, invites, receipts, gifts and 1:1 session emails." },
  { field: "art_flows", key: "flows", label: "Email flows and campaigns", hint: "The default for each one. You can still pick a different picture inside any single email." },
];

/** How flow and campaign emails present the sender, and the footer address the law asks for. */
export default async function EmailSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireStaff("sales");
  const { saved, error } = await searchParams;
  const settings = await loadEmailSettings(createServiceClient());
  const envFrom = process.env.EMAIL_FROM ?? "";

  return (
    <div className="space-y-5">
      <PageHeader title="Email settings" description="How flow and campaign emails show who they're from." />
      {saved && <Notice tone="success">Email settings saved.</Notice>}
      {typeof error === "string" && <Notice tone="error">{error}</Notice>}
      {!settings.postalAddress && (
        <Notice tone="error">Add your business postal address. Until then flows and campaigns don&apos;t send.</Notice>
      )}

      <Card title="Sender" description="Members see this in their inbox. Emails still come from your verified address.">
        <form action={saveEmailSettings} className="flex max-w-xl flex-col gap-5">
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Sender name</span>
            <input name="sender_name" className={INPUT} required maxLength={80} defaultValue={settings.senderName} placeholder="Roni from Bonded" />
            {envFrom && <span className={`text-[12px] ${MUTED}`}>Shows as: {fromWithName(envFrom, settings.senderName)}</span>}
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Reply-to address (optional)</span>
            <input name="reply_to" type="email" className={INPUT} maxLength={200} defaultValue={settings.replyTo ?? ""} placeholder="roni@bonded.dog" />
            <span className={`text-[12px] ${MUTED}`}>Where replies go. Leave empty to use the sender address.</span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Business postal address</span>
            <textarea name="postal_address" rows={3} className={INPUT} maxLength={300} defaultValue={settings.postalAddress ?? ""} placeholder={"Bonded Ltd.\nStreet 1, City\nIsrael"} />
            <span className={`text-[12px] ${MUTED}`}>
              Shown at the bottom of every flow and campaign email. Anti-spam laws (in the US and elsewhere) require a real address.
            </span>
          </label>
          <div>
            <button type="submit" className={BTN_PRIMARY}>
              Save
            </button>
          </div>
        </form>
      </Card>

      <Card title="Top picture" description="The picture above the text of each email. Photos of Roni change every day; line drawings suit emails people open once. Emails to the team never have one.">
        <form action={saveEmailArt} className="flex max-w-xl flex-col gap-5">
          {ART_ROWS.map(({ field, key, label, hint }) => (
            <label key={field} className="flex flex-col gap-1.5">
              <span className={LABEL}>{label}</span>
              <select name={field} className={INPUT} defaultValue={settings.emailArt[key]}>
                {EMAIL_ART_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {EMAIL_ART_LABELS[kind]}
                  </option>
                ))}
              </select>
              <span className={`text-[12px] ${MUTED}`}>{hint}</span>
            </label>
          ))}
          <div>
            <button type="submit" className={BTN_PRIMARY}>
              Save
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
