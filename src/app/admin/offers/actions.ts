"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { parsePriceToCents } from "@/lib/pricing";

const optionalPositiveInt = z.preprocess(
  (v) => (v === "" || v == null ? null : Number(v)),
  z.number().int().positive().nullable()
);

const OfferSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,80}$/, "Slug: lowercase letters, numbers and dashes"),
    description: z.string().trim().max(2000).optional(),
    payment_type: z.enum(["free", "one_time", "subscription"]),
    price: z.string().optional(),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/).default("USD"),
    interval: z.enum(["month", "year", ""]).optional(),
    days_of_access: optionalPositiveInt,
    status: z.enum(["draft", "published"]),
    provider_price_id: z.string().trim().max(100).optional(),
  })
  .transform((v, ctx) => {
    const cents = v.payment_type === "free" ? 0 : parsePriceToCents(v.price ?? "");
    if (cents === null || (v.payment_type !== "free" && cents === 0)) {
      ctx.addIssue({ code: "custom", message: "Enter a price greater than 0 (e.g. 49 or 49.50)" });
      return z.NEVER;
    }
    if (v.payment_type === "subscription" && !v.interval) {
      ctx.addIssue({ code: "custom", message: "Choose monthly or yearly billing for a subscription" });
      return z.NEVER;
    }
    return {
      title: v.title,
      slug: v.slug,
      description: v.description || null,
      payment_type: v.payment_type,
      price_cents: cents,
      currency: v.currency,
      interval: v.payment_type === "subscription" ? v.interval || null : null,
      days_of_access: v.payment_type === "one_time" ? v.days_of_access : null,
      status: v.status,
      provider_price_id: v.provider_price_id || null,
      updated_at: new Date().toISOString(),
    };
  });

function back(id: string, params: Record<string, string>): never {
  redirect(`/admin/offers/${id}?${new URLSearchParams(params).toString()}`);
}

/** Create (id = "new") or update an offer and its course list. */
export async function saveOffer(formData: FormData): Promise<void> {
  await requireStaff("sales");
  const id = String(formData.get("id") ?? "new");
  const parsed = OfferSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back(id, { error: parsed.error.issues[0].message });
  const courseIds = formData.getAll("course_ids").map(String).filter(Boolean);
  if (courseIds.length === 0) back(id, { error: "Choose at least one course for this offer" });

  const sb = createServiceClient();
  const result =
    id === "new"
      ? await sb.from("offers").insert(parsed.data).select("id").single()
      : await sb.from("offers").update(parsed.data).eq("id", id).select("id").single();
  if (result.error || !result.data) {
    const message = result.error?.code === "23505" ? "That slug is already used by another offer" : "Could not save the offer";
    console.error("[offers] save failed", { id, error: result.error?.message });
    back(id, { error: message });
  }
  const offerId = result.data.id;

  const { error: deleteError } = await sb.from("offer_courses").delete().eq("offer_id", offerId);
  const { error: insertError } = deleteError
    ? { error: deleteError }
    : await sb.from("offer_courses").insert(courseIds.map((course_id) => ({ offer_id: offerId, course_id })));
  if (insertError) {
    console.error("[offers] course list save failed", { offerId, error: insertError.message });
    back(offerId, { error: "Saved the offer, but not its course list. Please save again." });
  }

  revalidatePath("/admin/offers");
  back(offerId, { saved: "1" });
}
