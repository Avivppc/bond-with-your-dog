"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { parsePriceToCents } from "@/lib/pricing";
import { configuredProvider } from "@/lib/payments/provider";
import { DaysOfAccess } from "@/lib/admin-helpers/form-fields";
import { formValues, type OfferFormState } from "@/lib/admin-helpers/offer-form";

const UNIQUE_VIOLATION = "23505";

const OfferSchema = z
  .object({
    title: z.string().trim().min(2, "The title needs at least 2 characters.").max(200, "The title can be up to 200 characters."),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{2,80}$/, "Slug: 2–80 lowercase letters, numbers and dashes."),
    description: z.string().trim().max(2000, "The description can be up to 2,000 characters.").optional(),
    payment_type: z.enum(["free", "one_time", "subscription"], { message: "Choose a payment type." }),
    price: z.string().optional(),
    currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Currency: a 3-letter code such as USD or EUR."),
    interval: z.enum(["month", "year", ""], { message: "Choose monthly or yearly billing." }).optional(),
    days_of_access: DaysOfAccess,
    status: z.enum(["draft", "published"], { message: "Choose draft or published." }),
    provider_price_id: z.string().trim().max(100, "The Paddle price id is too long.").optional(),
    includes_community: z.preprocess((v) => v === "on", z.boolean()),
  })
  .transform((v, ctx) => {
    const cents = v.payment_type === "free" ? 0 : parsePriceToCents(v.price ?? "");
    if (cents === null || (v.payment_type !== "free" && cents === 0)) {
      ctx.addIssue({ code: "custom", message: "Enter a price greater than 0 (e.g. 49 or 49.50)." });
      return z.NEVER;
    }
    if (v.payment_type === "subscription" && !v.interval) {
      ctx.addIssue({ code: "custom", message: "Choose monthly or yearly billing for a subscription." });
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

const OfferId = z.union([z.literal("new"), z.string().uuid()]);

type Supabase = ReturnType<typeof createServiceClient>;

interface CourseCheck {
  error: string | null;
  /** Courses with a paywall: only these can be sold with "limited" access. */
  withPaywall: Set<string>;
}

/** Every chosen course must still exist (checked before saving, so an offer never loses its courses). */
async function checkCourses(sb: Supabase, offerId: string, courseIds: readonly string[]): Promise<CourseCheck> {
  const none = new Set<string>();
  if (courseIds.length === 0) return { error: "Choose at least one course for this offer.", withPaywall: none };
  const { data, error } = await sb.from("courses").select("id, paywall_after_module_id").in("id", [...courseIds]);
  if (error) {
    console.error("[offers] course check failed", { offerId, error: error.message });
    return { error: "Could not save the offer. Please try again.", withPaywall: none };
  }
  if ((data ?? []).length !== new Set(courseIds).size) {
    return { error: "One of the chosen courses no longer exists. Reload the page and try again.", withPaywall: none };
  }
  return { error: null, withPaywall: new Set((data ?? []).filter((c) => c.paywall_after_module_id).map((c) => c.id)) };
}

async function previousSlug(sb: Supabase, offerId: string): Promise<string | null> {
  if (offerId === "new") return null;
  const { data, error } = await sb.from("offers").select("slug").eq("id", offerId).maybeSingle();
  if (error) console.error("[offers] slug lookup failed", { offerId, error: error.message });
  return data?.slug ?? null;
}

function revalidateOffer(offerId: string, slugs: readonly (string | null)[]): void {
  revalidatePath("/admin/offers");
  revalidatePath(`/admin/offers/${offerId}`);
  revalidatePath("/admin/courses/[id]", "page");
  revalidatePath("/admin/people/[id]", "page");
  revalidatePath("/my-courses");
  revalidatePath("/learn/[courseId]", "page");
  for (const slug of new Set(slugs)) if (slug) revalidatePath(`/checkout/${slug}`);
}

/**
 * Create (id = "new") or update an offer and its course list. Validation problems come back as
 * state (the form keeps what was typed); a successful save redirects to the offer.
 */
export async function saveOffer(_prev: OfferFormState, formData: FormData): Promise<OfferFormState> {
  await requireStaff("sales");
  const values = formValues(formData);
  const fail = (error: string): OfferFormState => ({ error, values });

  const id = OfferId.safeParse(formData.get("id"));
  if (!id.success) return fail("This offer could not be found. Reload the page and try again.");
  const parsed = OfferSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const offer = parsed.data;
  // Paddle charges a price it knows about; a published paid offer without one can't be bought.
  if (configuredProvider() === "paddle" && offer.status === "published" && offer.payment_type !== "free" && !offer.provider_price_id) {
    return fail("Add the Paddle price ID (pri_…) before publishing a paid offer.");
  }

  const sb = createServiceClient();
  const courseIds = [...new Set(values.course_ids)];
  const courses = await checkCourses(sb, id.data, courseIds);
  if (courses.error) return fail(courses.error);
  const oldSlug = await previousSlug(sb, id.data);

  const result =
    id.data === "new"
      ? await sb.from("offers").insert(offer).select("id").single()
      : await sb.from("offers").update(offer).eq("id", id.data).select("id").maybeSingle();
  if (result.error || !result.data) {
    console.error("[offers] save failed", { id: id.data, error: result.error?.message ?? "not found" });
    if (result.error?.code === UNIQUE_VIOLATION) return fail("That slug is already used by another offer. Choose another one.");
    return fail(result.error ? "Could not save the offer. Please try again." : "This offer no longer exists.");
  }
  const offerId: string = result.data.id;

  const { error: deleteError } = await sb.from("offer_courses").delete().eq("offer_id", offerId);
  const { error: insertError } = deleteError
    ? { error: deleteError }
    : await sb.from("offer_courses").insert(
        courseIds.map((course_id) => ({
          offer_id: offerId,
          course_id,
          access_level: courses.withPaywall.has(course_id) && values.access_levels[course_id] === "limited" ? "limited" : "full",
        }))
      );
  revalidateOffer(offerId, [oldSlug, offer.slug]);
  if (insertError) {
    console.error("[offers] course list save failed", { offerId, error: insertError.message });
    // The offer row exists now, so continue on its own page (a retry must not create a second offer).
    redirect(`/admin/offers/${offerId}?${new URLSearchParams({ error: "Saved the offer, but not its course list. Please save again." })}`);
  }
  redirect(`/admin/offers/${offerId}?saved=1`);
}
