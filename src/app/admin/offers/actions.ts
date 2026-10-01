"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { parsePriceToCents } from "@/lib/pricing";
import { configuredProvider } from "@/lib/payments/provider";

const optionalPositiveInt = z.preprocess(
  (v) => (v === "" || v == null ? null : Number(v)),
  z.number({ message: "Access length must be a number of days." }).int("Access length must be whole days.").positive("Access length must be at least 1 day.").max(36500, "Access length is too long.").nullable()
);

const OfferSchema = z
  .object({
    title: z.string().trim().min(2, "The title needs at least 2 characters.").max(200, "The title can be up to 200 characters."),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,80}$/, "Slug: lowercase letters, numbers and dashes"),
    description: z.string().trim().max(2000, "The description can be up to 2,000 characters.").optional(),
    payment_type: z.enum(["free", "one_time", "subscription"]),
    price: z.string().optional(),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Currency: a 3-letter code such as USD or EUR.").default("USD"),
    interval: z.enum(["month", "year", ""]).optional(),
    days_of_access: optionalPositiveInt,
    status: z.enum(["draft", "published"]),
    provider_price_id: z.string().trim().max(100, "The Paddle price id is too long.").optional(),
    includes_community: z.preprocess((v) => v === "on", z.boolean()),
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
      includes_community: v.includes_community,
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
  // Paddle charges a price it knows about; a published paid offer without one can't be bought.
  const offer = parsed.data;
  if (configuredProvider() === "paddle" && offer.status === "published" && offer.payment_type !== "free" && !offer.provider_price_id) {
    back(id, { error: "Add the Paddle price ID (pri_…) before publishing a paid offer" });
  }
  const courseIds = formData.getAll("course_ids").map(String).filter(Boolean);
  if (courseIds.length === 0) back(id, { error: "Choose at least one course for this offer" });

  const sb = createServiceClient();
  // Check the course list before saving the offer, so a stale list never leaves an offer without courses.
  const { data: knownCourses, error: coursesError } = await sb.from("courses").select("id").in("id", courseIds);
  if (coursesError) {
    console.error("[offers] course check failed", { id, error: coursesError.message });
    back(id, { error: "Could not save the offer" });
  }
  if ((knownCourses ?? []).length !== new Set(courseIds).size) back(id, { error: "One of the chosen courses no longer exists. Reload the page and try again." });

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
    : await sb.from("offer_courses").insert(
        courseIds.map((course_id) => ({
          offer_id: offerId,
          course_id,
          access_level: formData.get(`access_level:${course_id}`) === "limited" ? "limited" : "full",
        }))
      );
  if (insertError) {
    console.error("[offers] course list save failed", { offerId, error: insertError.message });
    back(offerId, { error: "Saved the offer, but not its course list. Please save again." });
  }

  revalidatePath("/admin/offers");
  revalidatePath("/admin/courses/[id]", "page");
  revalidatePath(`/checkout/${offer.slug}`);
  back(offerId, { saved: "1" });
}
