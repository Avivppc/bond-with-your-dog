import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { formatOfferPrice, type PricedOffer } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function OffersPage() {
  await requireStaff("sales");
  const { data: offers, error } = await createServiceClient()
    .from("offers")
    .select("id, slug, title, payment_type, price_cents, currency, interval, status, provider_price_id, offer_courses(course_id)")
    .order("created_at", { ascending: false });
  if (error) console.error("[offers] list failed", error.message);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Offers</h1>
          <p className="text-sm text-[#6c6a69]">An offer is how people buy access: price, billing, and which courses it unlocks.</p>
        </div>
        <Link href="/admin/offers/new" className="bg-[#343332] text-white hover:bg-black px-4 py-2 rounded-full font-medium text-xs">
          + New offer
        </Link>
      </header>

      <section className="bg-white rounded-[12px] border border-[#e7e6e4] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-x-auto">
        {(offers ?? []).length === 0 ? (
          <p className="p-6 text-sm text-[#6c6a69]">No offers yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-sm text-[#6c6a69] border-b border-[#efeeed]">
              <tr>
                <th className="px-4 py-2">Offer</th>
                <th>Price</th>
                <th>Courses</th>
                <th>Payment setup</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#efeeed]">
              {(offers ?? []).map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3">
                    <p className="font-bold">{o.title}</p>
                    <p className="text-xs text-[#6c6a69]">/checkout/{o.slug}</p>
                  </td>
                  <td>{formatOfferPrice(o as unknown as PricedOffer)}</td>
                  <td>{o.offer_courses?.length ?? 0}</td>
                  <td className="text-xs">
                    {o.payment_type === "free" ? "—" : o.provider_price_id ? "✓ linked" : <span className="text-amber-700">needs price id</span>}
                  </td>
                  <td>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        o.status === "published" ? "bg-emerald-100 text-emerald-800" : "bg-[#f3f3f2] text-[#6c6a69]"
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="pe-4 text-end">
                    <Link href={`/admin/offers/${o.id}`} className="text-[#1a1a19] hover:underline font-bold">
                      Edit →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
