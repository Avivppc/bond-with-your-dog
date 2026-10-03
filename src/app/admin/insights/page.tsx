import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { insightsSchema, share, trend, type ContactInsights } from "@/lib/admin-insights";
import { Card, MUTED, Notice, PageHeader } from "../_components/ui";
import { StatCard } from "../_components/list-kit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contact insights" };

async function loadInsights(): Promise<ContactInsights | null> {
  const { data, error } = await createServiceClient().rpc("admin_contact_insights");
  if (error) {
    console.error("[insights] load failed", { error: error.message });
    return null;
  }
  const parsed = insightsSchema.safeParse(data);
  if (!parsed.success) {
    console.error("[insights] unexpected shape", { issue: parsed.error.issues[0]?.message });
    return null;
  }
  return parsed.data;
}

function EngagementBar({ healthy, atRisk, inactive }: ContactInsights["engagement"]) {
  const total = healthy + atRisk + inactive;
  const parts = [
    { label: "Healthy (0–90 days)", value: healthy, color: "#1c8a4a" },
    { label: "At risk (90–180 days)", value: atRisk, color: "#d08a16" },
    { label: "Inactive (180+ days or never)", value: inactive, color: "#b9b7b4" },
  ];
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#efeeed]" role="img" aria-label={parts.map((p) => `${p.label}: ${p.value}`).join(", ")}>
        {total > 0 && parts.map((p) => <div key={p.label} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />)}
      </div>
      <ul className="mt-4 grid gap-3 sm:grid-cols-3">
        {parts.map((p) => (
          <li key={p.label} className="flex items-start gap-2">
            <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} aria-hidden />
            <span>
              <span className="block text-[20px] font-semibold text-[#1a1a19]">{p.value}</span>
              <span className={`text-[13px] ${MUTED}`}>
                {p.label} · {share(p.value, total)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Contacts → Insights: who's on the list, who buys, who may get marketing email, who's engaged. */
export default async function InsightsPage() {
  await requireStaff("sales");
  const data = await loadInsights();

  return (
    <>
      <PageHeader title="Insights" description="Your contacts at a glance: members, quiz leads, customers and email subscribers." />
      {!data ? (
        <Notice tone="error">Couldn&apos;t load the numbers. Refresh to try again.</Notice>
      ) : (
        <div className="flex flex-col gap-6">
          <section aria-label="Contacts" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon="group" label="Contacts" value={String(data.contacts.total)} hint={`${data.contacts.members} members · ${data.contacts.leads} quiz leads`} href="/admin/people" />
            <StatCard icon="person_add" label="New contacts (30 days)" value={String(data.contacts.new30)} hint={trend(data.contacts.new30, data.contacts.newPrev30)} />
            <StatCard icon="shopping_bag" label="Customers" value={String(data.customers.total)} hint={`${share(data.customers.total, data.contacts.members)} of members have a chapter`} href="/admin/people?segment=students" />
            <StatCard icon="trending_up" label="New customers (30 days)" value={String(data.customers.new30)} hint={trend(data.customers.new30, data.customers.newPrev30)} />
          </section>

          <section aria-label="Email" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon="mark_email_read" label="Email subscribers" value={String(data.subscribers.total)} hint={`${share(data.subscribers.total, data.contacts.total)} of contacts · ${data.subscribers.new30} new in 30 days`} />
            <StatCard icon="block" label="No consent yet" value={String(data.subscribers.notConsented)} hint="Didn't tick the email box; they get no marketing email" />
            <StatCard icon="unsubscribe" label="Unsubscribed" value={String(data.unsubscribed.total)} hint={`${data.unsubscribed.link30} by link in 30 days`} />
            <StatCard icon="report" label="Complaints & bounces (30 days)" value={String(data.unsubscribed.complaint30 + data.unsubscribed.bounce30)} hint={`${data.unsubscribed.complaint30} spam reports · ${data.unsubscribed.bounce30} bounced`} />
          </section>

          <Card title="Subscriber engagement" description="When each subscriber last opened or clicked an email, or used the app.">
            <EngagementBar {...data.engagement} />
          </Card>

          <Card title="Customer activity" description="Customers who watched a lesson, practiced or signed in during the last 30 days.">
            <p className="text-[24px] font-semibold text-[#1a1a19]">
              {data.customers.active30} <span className={`text-[14px] font-normal ${MUTED}`}>of {data.customers.total} ({share(data.customers.active30, data.customers.total)})</span>
            </p>
          </Card>
        </div>
      )}
    </>
  );
}
