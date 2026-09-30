import { notFound, redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import { configuredProvider } from "@/lib/payments/provider";
import { formatOfferPrice, type PricedOffer } from "@/lib/pricing";
import { completeTestPayment } from "../actions";

export const dynamic = "force-dynamic";

/** Local-only stand-in for the payment provider (PAYMENTS_PROVIDER=test). */
export default async function TestPayPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  if (configuredProvider() !== "test") notFound();
  const { order: orderId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, offers(title, payment_type, price_cents, currency, interval)")
    .eq("id", orderId ?? "")
    .maybeSingle();
  if (!order) notFound();
  const offer = order.offers as unknown as (PricedOffer & { title: string }) | null;

  return (
    <>
      <Navbar />
      <main className="pt-32 pb-20 max-w-md mx-auto px-5 min-h-screen" style={{ backgroundColor: "#edf8ff" }}>
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4 border-2 border-dashed border-amber-400">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Test payment — no real money</p>
          <h1 className="text-2xl font-extrabold" style={{ color: "#243036" }}>
            {offer?.title}
          </h1>
          <p className="text-xl font-bold">{offer ? formatOfferPrice(offer) : ""}</p>
          {order.status !== "pending" ? (
            <p className="text-sm">This order is already {order.status}.</p>
          ) : (
            <div className="flex gap-3">
              <form action={completeTestPayment}>
                <input type="hidden" name="order" value={order.id} />
                <input type="hidden" name="outcome" value="pay" />
                <button type="submit" className="bg-emerald-600 text-white px-5 py-2.5 rounded-full font-bold text-sm">
                  Pay (test)
                </button>
              </form>
              <form action={completeTestPayment}>
                <input type="hidden" name="order" value={order.id} />
                <input type="hidden" name="outcome" value="cancel" />
                <button type="submit" className="px-5 py-2.5 rounded-full font-bold text-sm border border-slate-300">
                  Cancel
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
