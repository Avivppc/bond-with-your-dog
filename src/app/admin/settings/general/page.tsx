import { requireStaff } from "@/lib/admin";
import { loadSiteSettingsFresh } from "@/lib/site-settings-server";
import { SOCIAL_INFO, SOCIAL_KEYS } from "@/lib/site-settings";
import { turnstileEnabled } from "@/lib/turnstile";
import { BTN_PRIMARY, Card, INPUT, LABEL, MUTED, Notice, PageHeader, StatusPill } from "../../_components/ui";
import { saveSiteSettings } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "General settings" };

/** The academy's name, contact email and social links, as the public site shows them. */
export default async function GeneralSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireStaff("settings");
  const { saved, error } = await searchParams;
  const settings = await loadSiteSettingsFresh();
  const protectedForms = turnstileEnabled();

  return (
    <>
      <PageHeader title="General" description="How the academy presents itself on the website." />
      {saved && <Notice tone="success">Settings saved. The website shows them now.</Notice>}
      {typeof error === "string" && <Notice tone="error">{error}</Notice>}

      <form action={saveSiteSettings} className="space-y-6">
        <Card title="Academy details" description="Shown in the website footer and on the legal pages.">
          <div className="flex max-w-xl flex-col gap-5">
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Academy name</span>
              <input name="academy_name" className={INPUT} required maxLength={80} defaultValue={settings.academyName} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Contact email</span>
              <input name="contact_email" type="email" className={INPUT} required maxLength={200} defaultValue={settings.contactEmail} />
              <span className={`text-[12px] ${MUTED}`}>Where &quot;Contact us&quot; links go, and the address on the privacy, terms and refund pages.</span>
            </label>
          </div>
        </Card>

        <Card title="Social links" description="Each one you fill in appears in the website footer. Leave a field empty to hide it.">
          <div className="grid max-w-3xl gap-5 sm:grid-cols-2">
            {SOCIAL_KEYS.map((key) => (
              <label key={key} className="flex flex-col gap-1.5">
                <span className={LABEL}>{SOCIAL_INFO[key].label}</span>
                <input name={key} type="url" className={INPUT} maxLength={300} defaultValue={settings.social[key] ?? ""} placeholder={SOCIAL_INFO[key].placeholder} />
              </label>
            ))}
          </div>
        </Card>

        <div>
          <button type="submit" className={BTN_PRIMARY}>
            Save
          </button>
        </div>
      </form>

      <div className="mt-6">
        <Card title="Spam protection" description="Cloudflare Turnstile checks that the sign-up and quiz forms are filled in by people.">
          <div className="flex flex-wrap items-center gap-3 text-[14px]">
            {protectedForms ? <StatusPill tone="published">On</StatusPill> : <StatusPill tone="warning">Off</StatusPill>}
            <span className={MUTED}>
              {protectedForms
                ? "Forms are protected."
                : "To turn it on, add TURNSTILE_SECRET_KEY and NEXT_PUBLIC_TURNSTILE_SITE_KEY in Vercel, then redeploy."}
            </span>
          </div>
        </Card>
      </div>
    </>
  );
}
