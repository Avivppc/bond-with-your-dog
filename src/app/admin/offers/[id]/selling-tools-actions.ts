"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { parsePriceToCents } from "@/lib/pricing";
import { addOnUsable } from "@/lib/sales/pricing";

const Id = z.string().uuid();
const optionalId = z.preprocess((v) => (v === "" || v === null ? null : v), z.string().uuid().nullable());
const text = (max: number) => z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : null), z.string().max(max).nullable());
const whole = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? null : Number(v)), z.number().int().min(min).max(max).nullable());

const Tools = z.object({
  bump_offer_id: optionalId,
  bump_price: z.string().max(20).optional(),
  bump_headline: text(120),
  bump_text: text(400),
  upsell_offer_id: optionalId,
  upsell_price: z.string().max(20).optional(),
  upsell_headline: text(120),
  upsell_text: text(600),
  giftable: z.preprocess((v) => v === "on", z.boolean()),
  retention_percent: whole(1, 100),
  retention_cycles: whole(1, 12),
});

function back(offerId: string, params: Record<string, string>): never {
  redirect(`/admin/offers/${offerId}?${new URLSearchParams(params).toString()}#selling-tools`);
}

type OfferLite = { id: string; status: string; payment_type: string; price_cents: number; currency: string; title: string };

/** Checks one add-on (bump or upsell) and returns its price in cents, or an error message. */
function addOnPrice(
  label: string,
  offerId: string | null,
  priceText: string | undefined,
  main: OfferLite,
  offers: Map<string, OfferLite>,
): { cents: number | null; error: string | null } {
  if (!offerId) return { cents: null, error: null };
  const cents = parsePriceToCents(priceText ?? "");
  const addOn = offers.get(offerId) ?? null;
  if (!addOn) return { cents: null, error: `The ${label} offer no longer exists.` };
  if (cents === null || cents <= 0) return { cents: null, error: `Enter the ${label} price (e.g. 29).` };
  const usable = addOnUsable(
    { offerId, priceCents: cents },
    { id: addOn.id, status: "published", paymentType: addOn.payment_type, priceCents: addOn.price_cents, currency: addOn.currency },
    { id: main.id, currency: main.currency },
  );
  if (!usable) {
    return {
      cents: null,
      error: `The ${label} must be another one-time offer in ${main.currency}, at a price up to its own (${(addOn.price_cents / 100).toFixed(2)}).`,
    };
  }
  return { cents, error: null };
}

/** Admin → Offer → Selling tools: order bump, after-purchase upsell, gift, offer to stay. */
export async function saveSellingTools(formData: FormData): Promise<void> {
  await requireStaff("sales");
  const offerId = Id.safeParse(formData.get("offer_id"));
  if (!offerId.success) redirect("/admin/offers");
  const parsed = Tools.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back(offerId.data, { error: parsed.error.issues[0]?.message ?? "Check the selling tools." });
  const v = parsed.data;

  const sb = createServiceClient();
  const { data: rows, error: loadError } = await sb.from("offers").select("id, status, payment_type, price_cents, currency, title");
  if (loadError) {
    console.error("[offers] selling tools load failed", { offerId: offerId.data, error: loadError.message });
    back(offerId.data, { error: "Could not save. Please try again." });
  }
  const offers = new Map((rows ?? []).map((o) => [o.id as string, o as OfferLite]));
  const main = offers.get(offerId.data);
  if (!main) redirect("/admin/offers");

  const bump = addOnPrice("order bump", v.bump_offer_id, v.bump_price, main, offers);
  const upsell = addOnPrice("after-purchase offer", v.upsell_offer_id, v.upsell_price, main, offers);
  const problem = bump.error ?? upsell.error;
  if (problem) back(offerId.data, { error: problem });
  if (v.bump_offer_id && main.payment_type !== "one_time") back(offerId.data, { error: "An order bump can be added to one-time offers only." });
  if ((v.retention_percent === null) !== (v.retention_cycles === null)) {
    back(offerId.data, { error: "For the offer to stay, set both the discount and the number of payments (or leave both empty)." });
  }

  const { error } = await sb
    .from("offers")
    .update({
      bump_offer_id: v.bump_offer_id,
      bump_price_cents: bump.cents,
      bump_headline: v.bump_offer_id ? v.bump_headline : null,
      bump_text: v.bump_offer_id ? v.bump_text : null,
      upsell_offer_id: v.upsell_offer_id,
      upsell_price_cents: upsell.cents,
      upsell_headline: v.upsell_offer_id ? v.upsell_headline : null,
      upsell_text: v.upsell_offer_id ? v.upsell_text : null,
      giftable: main.payment_type === "one_time" && v.giftable,
      retention_percent: main.payment_type === "subscription" ? v.retention_percent : null,
      retention_cycles: main.payment_type === "subscription" ? v.retention_cycles : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", offerId.data);
  if (error) {
    console.error("[offers] selling tools save failed", { offerId: offerId.data, error: error.message });
    back(offerId.data, { error: "Could not save. Please try again." });
  }
  revalidatePath(`/admin/offers/${offerId.data}`);
  revalidatePath("/checkout/[slug]", "page");
  back(offerId.data, { saved: "tools" });
}
