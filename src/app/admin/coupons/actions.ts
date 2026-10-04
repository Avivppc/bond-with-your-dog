"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { parsePriceToCents } from "@/lib/pricing";
import { COUPON_CODE, normalizeCode } from "@/lib/sales/pricing";

function back(params: Record<string, string>): never {
  redirect(`/admin/coupons?${new URLSearchParams(params).toString()}`);
}

const dateOrNull = z.preprocess((v) => (typeof v === "string" && v ? v : null), z.string().date().nullable());

const NewCoupon = z.object({
  code: z.string().transform(normalizeCode).pipe(z.string().regex(COUPON_CODE, "Codes: 3–40 letters, numbers, - or _ (e.g. SPRING20).")),
  kind: z.enum(["percent", "amount"]),
  value: z.string().trim().min(1, "Enter how much the code takes off."),
  offer_ids: z.array(z.string().uuid()).default([]),
  max_redemptions: z.preprocess((v) => (v === "" || v === null ? null : Number(v)), z.number().int().min(1).max(100000).nullable()),
  starts_on: dateOrNull,
  expires_on: dateOrNull,
  note: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : null), z.string().max(200).nullable()),
});

/** Marketing → Coupons → New coupon. */
export async function createCoupon(formData: FormData): Promise<void> {
  const { user } = await requireStaff("sales");
  const parsed = NewCoupon.safeParse({ ...Object.fromEntries(formData), offer_ids: formData.getAll("offer_ids") });
  if (!parsed.success) back({ error: parsed.error.issues[0]?.message ?? "Check the coupon." });
  const v = parsed.data;

  const percent = v.kind === "percent" ? Number(v.value) : null;
  const amount = v.kind === "amount" ? parsePriceToCents(v.value) : null;
  if (v.kind === "percent" && (!Number.isInteger(percent) || percent! < 1 || percent! > 100)) back({ error: "A percentage between 1 and 100." });
  if (v.kind === "amount" && (amount === null || amount <= 0)) back({ error: "Enter an amount such as 15 or 15.50." });
  // Dates are whole days in UTC: from the start of the first day to the end of the last.
  const startsAt = v.starts_on ? `${v.starts_on}T00:00:00Z` : null;
  const expiresAt = v.expires_on ? `${v.expires_on}T23:59:59Z` : null;
  if (startsAt && expiresAt && expiresAt <= startsAt) back({ error: "The end date must come after the start date." });

  const { error } = await createServiceClient()
    .from("coupons")
    .insert({
      code: v.code,
      percent_off: percent,
      amount_off_cents: amount,
      offer_ids: v.offer_ids,
      max_redemptions: v.max_redemptions,
      starts_at: startsAt,
      expires_at: expiresAt,
      note: v.note,
      created_by: user.id,
    });
  if (error) {
    if (error.code === "23505") back({ error: `There's already a coupon ${v.code}.` });
    console.error("[coupons] create failed", { code: v.code, error: error.message });
    back({ error: "Could not create the coupon. Please try again." });
  }
  revalidatePath("/admin/coupons");
  back({ ok: `Coupon ${v.code} created.` });
}

const Toggle = z.object({ id: z.string().uuid(), active: z.enum(["true", "false"]) });

/** Turns a coupon on or off (codes are kept so past orders still show them). */
export async function setCouponActive(formData: FormData): Promise<void> {
  await requireStaff("sales");
  const parsed = Toggle.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back({ error: "Invalid request." });
  const active = parsed.data.active === "true";
  const { error } = await createServiceClient().from("coupons").update({ active }).eq("id", parsed.data.id);
  if (error) {
    console.error("[coupons] toggle failed", { id: parsed.data.id, error: error.message });
    back({ error: "Could not update the coupon." });
  }
  revalidatePath("/admin/coupons");
  back({ ok: active ? "Coupon turned on." : "Coupon turned off." });
}
