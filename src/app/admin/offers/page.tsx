import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { formatMoney, formatOfferPrice, type PricedOffer } from "@/lib/pricing";
import { formatAmounts } from "@/lib/admin-helpers/money";
import { BTN_PRIMARY, Card, EmptyState, PageHeader, StatusPill, TABLE, TD, TH, THEAD, TROW } from "../_components/ui";
import { StatCard } from "../_components/list-kit";
import { loadPricingStats } from "./sales-data";

export const dynamic = "force-dynamic";

interface OfferRow extends PricedOffer {
  id: string;
  slug: string;
  title: string;
  status: string;
  provider_price_id: string | null;
  includes_community: boolean;
  offer_courses: { courses: { title: string } | null }[] | null;
}

function productNames(offer: OfferRow): string {
  const names = (offer.offer_courses ?? []).flatMap((oc) => (oc.courses ? [oc.courses.title] : []));
  return [...names, ...(offer.includes_community ? ["Community"] : [])].join(", ") || "—";
}

export default async function OffersPage() {
  await requireStaff("sales");
  const [offersRes, stats] = await Promise.all([
    createServiceClient()
      .from("offers")
      .select("id, slug, title, payment_type, price_cents, currency, interval, status, provider_price_id, includes_community, offer_courses(courses(title))")
      .order("created_at", { ascending: false }),
    loadPricingStats(),
  ]);
  if (offersRes.error) console.error("[offers] list failed", offersRes.error.message);
  const offers = (offersRes.data ?? []) as unknown as OfferRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Offers"
        description="An offer is how people get access: its price, billing and the products it unlocks."
        actions={
          <Link href="/admin/offers/new" className={BTN_PRIMARY}>
            New offer
          </Link>
        }
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Purchases" hint="Last 30 days" value={stats.purchases30d.toLocaleString("en-US")} href="/admin/orders" />
        <StatCard label="Net revenue" hint="Last 30 days · after refunds" value={formatAmounts(stats.net30d)} href="/admin/analytics?range=30d" />
        <StatCard label="Net revenue" hint="All time · after refunds" value={formatAmounts(stats.netAllTime)} />
      </div>

      <Card flush>
        {offers.length === 0 ? (
          <EmptyState title="No offers yet.">Create an offer to start selling a course.</EmptyState>
        ) : (
          <div className="relative overflow-x-auto">
            <table className={TABLE}>
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>Offer title</th>
                  <th className={TH}>Products</th>
                  <th className={TH}>Price</th>
                  <th className={TH}>Qty sold</th>
                  <th className={TH}>Net revenue</th>
                  <th className={TH}>Status</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => {
                  const sales = stats.byOffer.get(o.id) ?? (stats.complete ? { purchases: 0, net: 0 } : null);
                  return (
                    <tr key={o.id} className={TROW}>
                      <td className={TD}>
                        <Link href={`/admin/offers/${o.id}`} className="font-medium hover:underline">
                          {o.title}
                        </Link>
                        <p className="text-[12px] text-[#6c6a69]">
                          /checkout/{o.slug}
                          {o.payment_type !== "free" && !o.provider_price_id && <span className="ml-2 text-[#8a5a00]">· needs a Paddle price id</span>}
                        </p>
                      </td>
                      <td className={`${TD} max-w-64 text-[#6c6a69]`}>{productNames(o)}</td>
                      <td className={`${TD} whitespace-nowrap`}>{formatOfferPrice(o)}</td>
                      <td className={`${TD} tabular-nums`}>{sales ? sales.purchases.toLocaleString("en-US") : "—"}</td>
                      <td className={`${TD} whitespace-nowrap tabular-nums`}>{sales ? formatMoney(sales.net, o.currency) : "—"}</td>
                      <td className={TD}>
                        <StatusPill tone={o.status === "published" ? "published" : "draft"}>{o.status === "published" ? "Published" : "Draft"}</StatusPill>
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
