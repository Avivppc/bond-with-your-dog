import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/admin";
import { getPaymentProvider } from "@/lib/payments/provider";
import { loadAddOn, ownsOffer, OFFER_FOR_SALE_COLUMNS, type OfferForSale } from "@/lib/sales/server";
import { formatCents, upsellStillOpen } from "@/lib/sales/pricing";

interface UpsellCardProps {
  orderId: string;
  userId: string;
}

/**
 * Kajabi's after-purchase upsell: right after a paid order, one more offer at a special price (open
 * for 48 hours). Only when our prices are charged, the buyer doesn't own it yet and hasn't taken it.
 */
export async function UpsellCard({ orderId, userId }: UpsellCardProps) {
  if (!getPaymentProvider()?.chargesOrderAmount) return null;
  const sb = createServiceClient();
  const { data: order } = await sb.from("orders").select("id, offer_id, status, paid_at, gift_recipient_email").eq("id", orderId).eq("user_id", userId).maybeSingle();
  if (!order || order.status !== "paid" || !upsellStillOpen(order.paid_at, new Date())) return null;
  const [{ data: offer }, { count: taken }] = await Promise.all([
    sb.from("offers").select(OFFER_FOR_SALE_COLUMNS).eq("id", order.offer_id).maybeSingle(),
    sb.from("orders").select("id", { count: "exact", head: true }).eq("upsell_of_order_id", order.id).eq("status", "paid"),
  ]);
  if (!offer || (taken ?? 0) > 0) return null;
  const upsell = await loadAddOn(offer as unknown as OfferForSale, "upsell");
  if (!upsell || (await ownsOffer(userId, upsell.offer.id))) return null;

  return (
    <section className="mt-10 rounded-2xl border-2 p-6 text-left shadow-sm" style={{ borderColor: "#8b4b00", background: "#fff8f0" }}>
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#8b4b00" }}>
        One-time offer · for the next 48 hours
      </p>
      <h2 className="mt-2 text-2xl font-extrabold tracking-tight" style={{ color: "#243036" }}>
        {upsell.headline || `Add ${upsell.offer.title}`}
      </h2>
      {upsell.text && (
        <p className="mt-2 whitespace-pre-line" style={{ color: "#515d64" }}>
          {upsell.text}
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Link
          href={`/checkout/${upsell.offer.slug}?after=${order.id}`}
          className="kinetic-gradient px-6 py-3 rounded-full font-bold shadow-md"
          style={{ color: "#fff0e6" }}
        >
          Yes, add it for {formatCents(upsell.priceCents, upsell.offer.currency)}
        </Link>
        {upsell.priceCents < upsell.offer.priceCents && (
          <span className="text-sm line-through" style={{ color: "#515d64" }}>
            {formatCents(upsell.offer.priceCents, upsell.offer.currency)}
          </span>
        )}
      </div>
    </section>
  );
}
