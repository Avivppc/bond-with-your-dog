import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { configuredProvider } from "@/lib/payments/provider";
import { loadReferralSettings, type ReferralSettings } from "@/lib/referrals-server";
import { BTN_PRIMARY, Card, EmptyState, INPUT, LABEL, Notice, PageHeader, StatusPill, TABLE, TD, TH, THEAD, TROW, type PillTone } from "@/app/admin/_components/ui";
import { StatCard, shortDate } from "@/app/admin/_components/list-kit";
import { saveReferralSettings } from "./actions";

export const dynamic = "force-dynamic";

const SHOWN = 100;

const STATUS: Record<string, { label: string; tone: PillTone }> = {
  signed_up: { label: "Joined", tone: "info" },
  converted: { label: "Bought", tone: "published" },
  reversed: { label: "Refunded", tone: "danger" },
};

interface ReferralRow {
  id: string;
  referrer_id: string;
  friend_id: string;
  status: string;
  created_at: string;
}

function logIfError(label: string, error: { message: string } | null | undefined): void {
  if (error) console.error(`[referrals] ${label} failed`, error.message);
}

/** A count, or "—" when its query failed (never a made-up 0). */
function countText(failed: unknown, n: number | null | undefined): string {
  return failed ? "—" : (n ?? 0).toLocaleString("en-US");
}

async function loadReferrals() {
  const sb = createServiceClient();
  const [listRes, joinedRes, convertedRes, rewardsRes] = await Promise.all([
    sb.from("referrals").select("id, referrer_id, friend_id, status, created_at").order("created_at", { ascending: false }).limit(SHOWN),
    sb.from("referrals").select("id", { count: "exact", head: true }),
    sb.from("referrals").select("id", { count: "exact", head: true }).eq("status", "converted"),
    sb.from("referral_rewards").select("status"),
  ]);
  logIfError("list", listRes.error);
  logIfError("joined count", joinedRes.error);
  logIfError("converted count", convertedRes.error);
  logIfError("rewards", rewardsRes.error);

  const rows = (listRes.data ?? []) as ReferralRow[];
  const ids = [...new Set(rows.flatMap((r) => [r.referrer_id, r.friend_id]))];
  const emailsRes = ids.length ? await sb.rpc("admin_user_emails", { p_user_ids: ids }) : null;
  logIfError("email lookup", emailsRes?.error);
  const emailOf = new Map(((emailsRes?.data ?? []) as { user_id: string; email: string }[]).map((u) => [u.user_id, u.email]));
  const rewards = (rewardsRes.data ?? []) as { status: string }[];

  return {
    rows,
    emailOf,
    failed: Boolean(listRes.error),
    stats: [
      { label: "Friends joined", value: countText(joinedRes.error, joinedRes.count) },
      { label: "Friends who bought", value: countText(convertedRes.error, convertedRes.count) },
      { label: "Rewards issued", value: countText(rewardsRes.error, rewards.length) },
      { label: "Rewards used", value: countText(rewardsRes.error, rewards.filter((r) => r.status === "used").length) },
    ],
  };
}

function ContactLink({ userId, email }: { userId: string; email: string | undefined }) {
  return (
    <Link href={`/admin/people/${userId}`} className="hover:underline">
      {email ?? "Deleted account"}
    </Link>
  );
}

function SettingsForm({ settings, paddle }: { settings: ReferralSettings; paddle: boolean }) {
  return (
    <form action={saveReferralSettings} className="flex flex-col gap-4">
      <label className="flex items-center gap-2.5">
        <input type="checkbox" name="enabled" defaultChecked={settings.enabled} className="h-4 w-4 accent-[#343332]" />
        <span className="text-sm font-medium">Program is on</span>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Friend discount (%)</span>
          <input name="friend_discount_percent" type="number" min={0} max={100} required defaultValue={settings.friendDiscountPercent} className={INPUT} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Referrer reward (%)</span>
          <input name="reward_percent" type="number" min={0} max={100} required defaultValue={settings.rewardPercent} className={INPUT} />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className={LABEL}>Friend must buy within (days)</span>
        <input name="attribution_days" type="number" min={1} max={365} required defaultValue={settings.attributionDays} className={INPUT} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={LABEL}>Paddle discount id — friend</span>
        <input name="friend_paddle_discount_id" maxLength={100} defaultValue={settings.friendPaddleDiscountId ?? ""} placeholder="dsc_…" className={INPUT} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={LABEL}>Paddle discount id — referrer reward</span>
        <input name="reward_paddle_discount_id" maxLength={100} defaultValue={settings.rewardPaddleDiscountId ?? ""} placeholder="dsc_…" className={INPUT} />
      </label>
      <p className="text-xs text-[#6c6a69]">
        {paddle
          ? "With Paddle, create two percentage discounts in Paddle (matching the percents above) and paste their ids. A discount without an id isn't applied."
          : "In test mode the percents are applied directly. Before going live with Paddle, add a matching Paddle discount id for each."}
      </p>
      <label className="flex flex-col gap-1.5">
        <span className={LABEL}>Text on the student page (optional)</span>
        <textarea name="description" rows={3} maxLength={500} defaultValue={settings.description ?? ""} className={INPUT} />
      </label>
      <div>
        <button type="submit" className={BTN_PRIMARY}>
          Save
        </button>
      </div>
    </form>
  );
}

export default async function ReferralsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireStaff("sales");
  const { saved, error } = await searchParams;
  const [settings, data] = await Promise.all([loadReferralSettings(), loadReferrals()]);

  return (
    <div className="space-y-6">
      <PageHeader title="Referrals" description="Friend brings friend: students share a link, friends save on their first purchase, referrers earn a discount." />
      {saved && <Notice tone="success">Referral settings saved.</Notice>}
      {typeof error === "string" && <Notice tone="error">{error}</Notice>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Program numbers">
        {data.stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} />
        ))}
      </section>

      {/* grid-cols-1 (minmax(0,1fr)) lets the table scroll inside its card on phones instead of widening the page. */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card flush title="Referrals" description={`Most recent ${SHOWN}.`}>
          {data.failed ? (
            <EmptyState title="Referrals couldn't be loaded.">Please refresh the page.</EmptyState>
          ) : data.rows.length === 0 ? (
            <EmptyState title="No referrals yet.">Students find their link under “Refer a friend” in the member portal.</EmptyState>
          ) : (
            <div className="relative overflow-x-auto">
              <table className={TABLE}>
                <thead className={THEAD}>
                  <tr>
                    <th className={TH}>Referrer</th>
                    <th className={TH}>Friend</th>
                    <th className={TH}>Joined</th>
                    <th className={TH}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.id} className={TROW}>
                      <td className={TD}>
                        <ContactLink userId={r.referrer_id} email={data.emailOf.get(r.referrer_id)} />
                      </td>
                      <td className={TD}>
                        <ContactLink userId={r.friend_id} email={data.emailOf.get(r.friend_id)} />
                      </td>
                      <td className={`${TD} whitespace-nowrap text-[#6c6a69]`}>{shortDate(r.created_at)}</td>
                      <td className={TD}>
                        <StatusPill tone={STATUS[r.status]?.tone ?? "draft"}>{STATUS[r.status]?.label ?? r.status}</StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Program settings">
          <SettingsForm settings={settings} paddle={configuredProvider() === "paddle"} />
        </Card>
      </div>
    </div>
  );
}
