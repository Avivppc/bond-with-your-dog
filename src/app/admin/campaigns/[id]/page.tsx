import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/email";
import { emailDocFromNodeData } from "@/lib/email-blocks/defaults";
import { renderEmailDoc } from "@/lib/email-blocks/render";
import { loadCampaign, ATTRIBUTION_DAYS } from "@/lib/flows/server/campaign-stats";
import { percent } from "@/lib/flows/stats";
import { formatUsd } from "@/lib/flows/discount";
import { EXAMPLE_VARS } from "@/lib/flows/template";
import { BTN_DANGER, BTN_SECONDARY, Card, MUTED, PageHeader, StatusPill } from "../../_components/ui";
import { StatCard, shortDate } from "../../_components/list-kit";
import { ConfirmSubmit } from "../../_components/ConfirmSubmit";
import { deleteCampaign, duplicateCampaign, stopCampaign } from "../actions";
import { AUDIENCE_LABEL, STATUS_LABEL, STATUS_TONE } from "../audience";
import { CampaignEditor } from "./CampaignEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Campaign" };

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("sales");
  const { id } = await params;
  const sb = createServiceClient();
  const [loaded, chaptersRes] = await Promise.all([loadCampaign(sb, id), sb.from("courses").select("id, title, chapter_number").not("chapter_number", "is", null).order("chapter_number")]);
  if (!loaded) notFound();
  const { campaign: c, stats } = loaded;
  const chapters = (chaptersRes.data ?? []).map((ch) => ({ id: ch.id as string, title: ch.title as string }));
  const editable = c.status === "draft" || c.status === "scheduled";
  const doc = emailDocFromNodeData(c.email);

  return (
    <>
      <PageHeader
        title={c.name}
        crumbs={[{ label: "Campaigns", href: "/admin/campaigns" }, { label: c.name }]}
        actions={<StatusPill tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</StatusPill>}
      />

      {editable ? (
        <CampaignEditor id={c.id} status={c.status as "draft" | "scheduled"} scheduledAt={c.scheduled_at} scheduledLocal={c.local_time ? c.scheduled_local : null} initial={{ name: c.name, audience: c.audience, email: doc }} chapters={chapters} siteUrl={siteUrl()} />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard
              label="Sent"
              value={String(stats.emails.sent)}
              hint={c.status === "sending" ? `Still sending, ${c.recipients ?? "…"} in all` : `${c.status === "canceled" ? "Stopped" : "Finished"} ${c.sent_at ? shortDate(c.sent_at) : ""}`}
            />
            <StatCard label="Open rate" value={percent(stats.emails.openRate)} hint={`${stats.emails.opened} opened`} />
            <StatCard label="Click rate" value={percent(stats.emails.clickRate)} hint={`${stats.emails.clicked} clicked`} />
            <StatCard label="Purchases" value={String(stats.purchases)} hint={`${formatUsd(stats.revenueCents)} within ${ATTRIBUTION_DAYS} days`} />
            <StatCard label="Unsubscribes" value={String(stats.unsubscribes)} hint={`${stats.emails.bounced} bounced`} />
          </div>
          <Card title="What was sent" description={`To: ${AUDIENCE_LABEL[c.audience.kind]}`}>
            <p className="mb-3 font-medium">{doc.subject}</p>
            <iframe
              title="Email as sent"
              sandbox=""
              className="h-[640px] w-full rounded-[8px] border border-[#e7e6e4]"
              srcDoc={renderEmailDoc(doc, { siteUrl: siteUrl(), vars: { ...EXAMPLE_VARS } }).html}
            />
            <p className={`mt-2 text-[12px] ${MUTED}`}>Shown with example names.</p>
          </Card>
        </>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {c.status === "sending" && (
          <form action={stopCampaign}>
            <input type="hidden" name="id" value={c.id} />
            <ConfirmSubmit className={BTN_DANGER} message="Stop sending? People who haven't got it yet won't get it.">
              Stop sending
            </ConfirmSubmit>
          </form>
        )}
        <form action={duplicateCampaign}>
          <input type="hidden" name="id" value={c.id} />
          <button type="submit" className={BTN_SECONDARY}>
            Duplicate
          </button>
        </form>
        {c.status !== "sending" && (
          <form action={deleteCampaign}>
            <input type="hidden" name="id" value={c.id} />
            <ConfirmSubmit className={BTN_DANGER} message="Delete this campaign? Its numbers are deleted too.">
              Delete
            </ConfirmSubmit>
          </form>
        )}
      </div>
    </>
  );
}
