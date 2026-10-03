import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { loadEmailSettings } from "@/lib/flows/server/email-settings";
import { fromWithName } from "@/lib/flows/sender";
import { BTN_PRIMARY, Card, INPUT, LABEL, MUTED, Notice, PageHeader } from "../../_components/ui";
import { saveEmailSettings } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Email settings" };

/** How flow and campaign emails present the sender, and the footer address the law asks for. */
export default async function EmailSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireStaff("sales");
  const { saved, error } = await searchParams;
  const settings = await loadEmailSettings(createServiceClient());
  const envFrom = process.env.EMAIL_FROM ?? "";

  return (
    <>
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
    </>
  );
}
