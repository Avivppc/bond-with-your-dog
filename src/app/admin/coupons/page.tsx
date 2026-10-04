import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { formatCents } from "@/lib/sales/pricing";
import { BTN_PRIMARY, BTN_SECONDARY, Card, EmptyState, INPUT, LABEL, MUTED, Notice, PageHeader, StatusPill, TABLE, TD, TH, THEAD, TROW } from "../_components/ui";
import { shortDate } from "../_components/list-kit";
import { createCoupon, setCouponActive } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coupons" };

interface CouponRow {
  id: string;
  code: string;
  percent_off: number | null;
  amount_off_cents: number | null;
  offer_ids: string[];
  max_redemptions: number | null;
  starts_at: string | null;
  expires_at: string | null;
  active: boolean;
  note: string | null;
  created_at: string;
  affiliates: { id: string; name: string } | null;
}

function status(c: CouponRow, now: Date): { tone: "published" | "draft" | "warning"; label: string } {
  if (!c.active) return { tone: "draft", label: "Off" };
  if (c.expires_at && new Date(c.expires_at) <= now) return { tone: "draft", label: "Expired" };
  if (c.starts_at && new Date(c.starts_at) > now) return { tone: "warning", label: "Scheduled" };
  return { tone: "published", label: "Active" };
}

/** Public discount codes anyone can type at checkout (personal codes from email flows live in Discount codes). */
export default async function CouponsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireStaff("sales");
  const params = await searchParams;
  const sb = createServiceClient();
  const [{ data: coupons, error }, { data: offers }] = await Promise.all([
    sb
      .from("coupons")
      .select("id, code, percent_off, amount_off_cents, offer_ids, max_redemptions, starts_at, expires_at, active, note, created_at, affiliates(id, name)")
      .order("created_at", { ascending: false }),
    sb.from("offers").select("id, title, currency").eq("payment_type", "one_time").order("title"),
  ]);
  if (error) console.error("[coupons] list failed", error.message);
  const rows = (coupons ?? []) as unknown as CouponRow[];
  const offerTitle = new Map((offers ?? []).map((o) => [o.id as string, o.title as string]));
  const counts = await Promise.all(rows.map((c) => sb.rpc("coupon_redemptions", { p_coupon_id: c.id })));
  const now = new Date();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Coupons"
        description="Codes anyone can type at checkout, like SPRING20. They work on one-time offers and are charged once online payments run through PayPlus."
      />
      {typeof params.ok === "string" && <Notice tone="success">{params.ok}</Notice>}
      {typeof params.error === "string" && <Notice tone="error">{params.error}</Notice>}

      <Card title="New coupon">
        <form action={createCoupon} className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Code</span>
            <input name="code" required maxLength={40} placeholder="SPRING20" className={`${INPUT} uppercase`} />
          </label>
          <div className="grid grid-cols-[1fr_120px] gap-2">
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Takes off</span>
              <select name="kind" defaultValue="percent" className={INPUT}>
                <option value="percent">A percentage (%)</option>
                <option value="amount">A fixed amount</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>How much</span>
              <input name="value" required inputMode="decimal" placeholder="20" className={INPUT} />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Works on</span>
            <select name="offer_ids" multiple size={Math.min(6, Math.max(3, (offers ?? []).length))} className={INPUT}>
              {(offers ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
            <span className={`text-[12px] ${MUTED}`}>Choose none for every one-time offer. Cmd/Ctrl-click to choose several.</span>
          </label>
          <div className="grid content-start gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Limit (total uses)</span>
              <input name="max_redemptions" type="number" min={1} placeholder="No limit" className={INPUT} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>From</span>
                <input name="starts_on" type="date" className={INPUT} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className={LABEL}>Until (incl.)</span>
                <input name="expires_on" type="date" className={INPUT} />
              </label>
            </div>
          </div>
          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className={LABEL}>Note (only the team sees it)</span>
            <input name="note" maxLength={200} placeholder="Spring newsletter" className={INPUT} />
          </label>
          <div className="md:col-span-2">
            <button type="submit" className={BTN_PRIMARY}>
              Create coupon
            </button>
          </div>
        </form>
      </Card>

      <Card title="Your coupons" flush>
        {rows.length === 0 ? (
          <EmptyState title="No coupons yet.">Create one above and share the code in a post, an email or a live session.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className={TABLE}>
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>Code</th>
                  <th className={TH}>Discount</th>
                  <th className={`${TH} max-md:hidden`}>Works on</th>
                  <th className={TH}>Used</th>
                  <th className={`${TH} max-lg:hidden`}>Dates</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c, i) => {
                  const s = status(c, now);
                  const used = Number(counts[i]?.data ?? 0);
                  return (
                    <tr key={c.id} className={TROW}>
                      <td className={TD}>
                        <span className="font-mono font-semibold">{c.code}</span>
                        {c.affiliates && (
                          <Link href={`/admin/affiliates/${c.affiliates.id}`} className={`block text-[12px] hover:underline ${MUTED}`}>
                            Affiliate: {c.affiliates.name}
                          </Link>
                        )}
                        {c.note && <span className={`block text-[12px] ${MUTED}`}>{c.note}</span>}
                      </td>
                      <td className={TD}>{c.percent_off !== null ? `${c.percent_off}% off` : `${formatCents(c.amount_off_cents ?? 0, "USD")} off`}</td>
                      <td className={`${TD} max-md:hidden`}>{c.offer_ids.length === 0 ? "All one-time offers" : c.offer_ids.map((id) => offerTitle.get(id) ?? "Removed offer").join(", ")}</td>
                      <td className={`${TD} tabular-nums`}>
                        {used}
                        {c.max_redemptions !== null && ` / ${c.max_redemptions}`}
                      </td>
                      <td className={`${TD} whitespace-nowrap text-[#6c6a69] max-lg:hidden`}>
                        {c.starts_at || c.expires_at ? `${c.starts_at ? shortDate(c.starts_at) : "Now"} – ${c.expires_at ? shortDate(c.expires_at) : "no end"}` : "Always"}
                      </td>
                      <td className={TD}>
                        <StatusPill tone={s.tone}>{s.label}</StatusPill>
                      </td>
                      <td className={`${TD} text-right`}>
                        <form action={setCouponActive}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="active" value={c.active ? "false" : "true"} />
                          <button type="submit" className={BTN_SECONDARY}>
                            {c.active ? "Turn off" : "Turn on"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
