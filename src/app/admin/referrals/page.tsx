import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { configuredProvider } from "@/lib/payments/provider";
import { loadReferralSettings } from "@/lib/referrals-server";
import { BTN_PRIMARY, Card, EmptyState, INPUT, LABEL, Notice, PageHeader, StatusPill, type PillTone } from "@/app/admin/_components/ui";
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
  converted_at: string | null;
}

export default async function ReferralsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireStaff("sales");
  const { saved, error } = await searchParams;
  const sb = createServiceClient();
  const settings = await loadReferralSettings();

  const [listRes, joinedRes, convertedRes, rewardsRes] = await Promise.all([
    sb.from("referrals").select("id, referrer_id, friend_id, status, created_at, converted_at").order("created_at", { ascending: false }).limit(SHOWN),
    sb.from("referrals").select("id", { count: "exact", head: true }),
    sb.from("referrals").select("id", { count: "exact", head: true }).eq("status", "converted"),
    sb.from("referral_rewards").select("status"),
  ]);
  const rows = (listRes.data ?? []) as ReferralRow[];
  const ids = [...new Set(rows.flatMap((r) => [r.referrer_id, r.friend_id]))];
  const emailsRes = ids.length ? await sb.rpc("admin_user_emails", { p_user_ids: ids }) : null;
  const emailOf = new Map(((emailsRes?.data ?? []) as { user_id: string; email: string }[]).map((u) => [u.user_id, u.email]));
  const rewards = (rewardsRes.data ?? []) as { status: string }[];
  const paddle = configuredProvider() === "paddle";

  const stats = [
    { label: "Friends joined", value: joinedRes.count ?? 0 },
    { label: "Friends who bought", value: convertedRes.count ?? 0 },
    { label: "Rewards issued", value: rewards.length },
    { label: "Rewards used", value: rewards.filter((r) => r.status === "used").length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Referrals" description="Friend brings friend: students share a link, friends save on their first purchase, referrers earn a discount." />
      {saved && <Notice tone="success">Referral settings saved.</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[12px] border border-[#e7e6e4] bg-white p-5">
            <p className="text-sm text-[#6c6a69]">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card flush title="Referrals" description={`Most recent ${SHOWN}.`}>
          {rows.length === 0 ? (
            <EmptyState title="No referrals yet.">Students find their link under “Refer a friend” in the member portal.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-y border-[#efeeed] text-left text-[#6c6a69]">
                  <tr>
                    <th className="px-5 py-3 font-medium">Referrer</th>
                    <th className="px-3 py-3 font-medium">Friend</th>
                    <th className="px-3 py-3 font-medium">Joined</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#efeeed]">
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-5 py-3">{emailOf.get(r.referrer_id) ?? "—"}</td>
                      <td className="px-3 py-3">{emailOf.get(r.friend_id) ?? "—"}</td>
                      <td className="px-3 py-3 text-[#6c6a69]">{new Date(r.created_at).toLocaleDateString("en-US")}</td>
                      <td className="px-5 py-3">
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
          <form action={saveReferralSettings} className="flex flex-col gap-4">
            <label className="flex items-center gap-2.5">
              <input type="checkbox" name="enabled" defaultChecked={settings.enabled} className="h-4 w-4 accent-[#343332]" />
              <span className="text-sm font-medium">Program is on</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>Friend discount (%)</span>
                <input name="friend_discount_percent" type="number" min={0} max={100} defaultValue={settings.friendDiscountPercent} className={INPUT} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>Referrer reward (%)</span>
                <input name="reward_percent" type="number" min={0} max={100} defaultValue={settings.rewardPercent} className={INPUT} />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Friend must buy within (days)</span>
              <input name="attribution_days" type="number" min={1} max={365} defaultValue={settings.attributionDays} className={INPUT} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Paddle discount id — friend</span>
              <input name="friend_paddle_discount_id" defaultValue={settings.friendPaddleDiscountId ?? ""} placeholder="dsc_…" className={INPUT} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Paddle discount id — referrer reward</span>
              <input name="reward_paddle_discount_id" defaultValue={settings.rewardPaddleDiscountId ?? ""} placeholder="dsc_…" className={INPUT} />
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
        </Card>
      </div>
    </div>
  );
}
