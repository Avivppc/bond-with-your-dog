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
          <h1 className="text-3xl font-extrabold tracking-tighter">Offers</h1>
          <p className="text-sm text-slate-500">An offer is how people buy access: price, billing, and which courses it unlocks.</p>
        </div>
        <Link href="/admin/offers/new" className="bg-orange-700 text-white px-4 py-2 rounded-full font-bold text-xs">
          + New offer
        </Link>
      </header>

      <section className="bg-white rounded-xl shadow-sm overflow-hidden">
        {(offers ?? []).length === 0 ? (
          <p className="p-6 text-sm text-slate-500">No offers yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-slate-500 bg-slate-50">
              <tr>
                <th className="px-4 py-2">Offer</th>
                <th>Price</th>
                <th>Courses</th>
                <th>Payment setup</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(offers ?? []).map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3">
                    <p className="font-bold">{o.title}</p>
                    <p className="text-xs text-slate-500">/checkout/{o.slug}</p>
                  </td>
                  <td>{formatOfferPrice(o as unknown as PricedOffer)}</td>
                  <td>{o.offer_courses?.length ?? 0}</td>
                  <td className="text-xs">
                    {o.payment_type === "free" ? "—" : o.provider_price_id ? "✓ linked" : <span className="text-amber-700">needs price id</span>}
                  </td>
                  <td>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        o.status === "published" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="pe-4 text-end">
                    <Link href={`/admin/offers/${o.id}`} className="text-orange-700 font-bold">
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
