"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { parsePriceToCents } from "@/lib/pricing";

export interface PriceFormState {
  ok: boolean;
  message: string;
}

const Input = z.object({
  courseId: z.string().min(1).max(100),
  price: z.string().max(20),
  status: z.enum(["published", "draft"]),
});

/** Members pay in dollars only. */
const CURRENCY = "USD";

/**
 * Sets what members pay for a chapter: updates the chapter's one-time full-access offer, or creates
 * it the first time. The price members see at checkout, in the app and in flow emails comes from here.
 */
export async function saveChapterPrice(_prev: PriceFormState, formData: FormData): Promise<PriceFormState> {
  await requireStaff("sales");
  const parsed = Input.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Check the form and try again." };
  const cents = parsePriceToCents(parsed.data.price);
  if (cents === null || cents < 100) return { ok: false, message: "Enter a price in dollars, like 129 or 129.50." };

  const sb = createServiceClient();
  const { courseId, status } = parsed.data;
  const { data: course } = await sb.from("courses").select("id, title").eq("id", courseId).maybeSingle();
  if (!course) return { ok: false, message: "That chapter no longer exists." };

  const { data: links } = await sb.from("offer_courses").select("offer_id, offers!inner(id, payment_type, status)").eq("course_id", courseId).eq("access_level", "full").eq("offers.payment_type", "one_time");
  // Only an offer that sells exactly this chapter: a bundle's price is edited under Offers.
  const candidates = (links ?? []).map((l) => l.offers as unknown as { id: string; status: string });
  const { data: contents } = candidates.length ? await sb.from("offer_courses").select("offer_id").in("offer_id", candidates.map((o) => o.id)) : { data: [] };
  const singles = candidates.filter((o) => (contents ?? []).filter((c) => c.offer_id === o.id).length === 1);
  const existing = singles.sort((a, b) => Number(b.status === "published") - Number(a.status === "published"))[0];

  if (existing) {
    const { error } = await sb.from("offers").update({ price_cents: cents, currency: CURRENCY, status }).eq("id", existing.id);
    if (error) return { ok: false, message: "Couldn't save the price. Try again." };
  } else {
    const { data: offer, error } = await sb
      .from("offers")
      .insert({ slug: course.id, title: course.title, payment_type: "one_time", price_cents: cents, currency: CURRENCY, status })
      .select("id")
      .single();
    if (error || !offer) return { ok: false, message: error?.code === "23505" ? "An offer with this chapter's address already exists. Edit it under Sales → Offers." : "Couldn't create the offer. Try again." };
    const { error: linkError } = await sb.from("offer_courses").insert({ offer_id: offer.id, course_id: course.id, access_level: "full" });
    if (linkError) return { ok: false, message: "The offer was created but couldn't be linked to the chapter. Link it under Sales → Offers." };
  }
  revalidatePath("/admin/pricing");
  revalidatePath("/admin/offers");
  return { ok: true, message: status === "published" ? `${course.title} is on sale.` : `${course.title}: price saved as a draft (not on sale yet).` };
}
