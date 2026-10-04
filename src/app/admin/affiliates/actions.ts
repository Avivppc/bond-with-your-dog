"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { AFFILIATE_CODE } from "@/lib/affiliates/rules";
import { sendAffiliateWelcome, syncAffiliateCoupon } from "@/lib/affiliates/server";

function back(path: string, params: Record<string, string>): never {
  redirect(`${path}?${new URLSearchParams(params).toString()}`);
}

const NAME = /^[\p{L}\p{M}][\p{L}\p{M}' .-]{0,79}$/u;

// Empty = no discount code for this affiliate.
const couponPercent = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
  z.number().int().min(1, "Code discount: 1–90%, or empty for none.").max(90, "Code discount: 1–90%, or empty for none.").nullable(),
);

const NewAffiliate = z.object({
  name: z.string().trim().regex(NAME, "Enter the affiliate's name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email.").max(254),
  code: z.string().trim().toLowerCase().regex(AFFILIATE_CODE, "Link code: 3–30 lowercase letters, numbers and dashes."),
  commission_percent: z.coerce.number().int().min(1, "Commission: 1–90%.").max(90, "Commission: 1–90%."),
  coupon_percent: couponPercent,
  note: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : null), z.string().max(200).nullable()),
  send_welcome: z.preprocess((v) => v === "on", z.boolean()),
});

/** Sales → Affiliates → New affiliate (optionally emails them their link). */
export async function createAffiliate(formData: FormData): Promise<void> {
  const { user } = await requireStaff("sales");
  const parsed = NewAffiliate.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back("/admin/affiliates", { error: parsed.error.issues[0]?.message ?? "Check the details." });
  const v = parsed.data;

  const sb = createServiceClient();
  // Not linked to an account here: it links when they open /affiliate signed in with this (confirmed) email.
  const { data, error } = await sb
    .from("affiliates")
    .insert({
      name: v.name,
      email: v.email,
      code: v.code,
      commission_percent: v.commission_percent,
      coupon_percent: v.coupon_percent,
      note: v.note,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "23505") back("/admin/affiliates", { error: "That email or link code is already used by another affiliate." });
    console.error("[affiliates] create failed", { error: error?.message });
    back("/admin/affiliates", { error: "Could not add the affiliate. Please try again." });
  }
  const emailed = v.send_welcome ? await sendAffiliateWelcome(v) : false;
  revalidatePath("/admin/affiliates");
  back(`/admin/affiliates/${data.id}`, { ok: v.send_welcome ? (emailed ? "Affiliate added and emailed their link." : "Affiliate added. The email couldn't be sent (email isn't set up).") : "Affiliate added." });
}

const Update = z.object({
  id: z.string().uuid(),
  commission_percent: z.coerce.number().int().min(1).max(90),
  coupon_percent: couponPercent,
  active: z.preprocess((v) => v === "on", z.boolean()),
  note: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : null), z.string().max(200).nullable()),
});

/** Commission (for future sales), their code's discount, on/off and note. */
export async function updateAffiliate(formData: FormData): Promise<void> {
  await requireStaff("sales");
  const parsed = Update.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back(`/admin/affiliates/${String(formData.get("id") ?? "")}`, { error: parsed.error.issues[0]?.message ?? "Check the details." });
  const { id, ...fields } = parsed.data;
  const sb = createServiceClient();
  const { data: before, error } = await sb.from("affiliates").select("coupon_percent, active").eq("id", id).maybeSingle();
  const { error: saveError } = before ? await sb.from("affiliates").update(fields).eq("id", id) : { error };
  if (!before || saveError) {
    console.error("[affiliates] update failed", { id, error: saveError?.message ?? "not found" });
    back(`/admin/affiliates/${id}`, { error: "Could not save. Please try again." });
  }
  const synced = await syncAffiliateCoupon(id, before, fields);
  revalidatePath("/admin/affiliates");
  revalidatePath("/admin/coupons");
  if (!synced) back(`/admin/affiliates/${id}`, { error: "Saved, but their discount code didn't update. Save again to retry." });
  back(`/admin/affiliates/${id}`, { ok: "Saved." });
}

const Payout = z.object({ id: z.string().uuid(), upto: z.string().datetime({ offset: true }) });

/** "Mark all as paid": every pending commission of this affiliate, after paying them outside Bonded. */
export async function markCommissionsPaid(formData: FormData): Promise<void> {
  await requireStaff("sales");
  const parsed = Payout.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/affiliates");
  const { data, error } = await createServiceClient()
    .from("affiliate_commissions")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("affiliate_id", parsed.data.id)
    .eq("status", "pending")
    // Only what the page showed: a sale that arrived meanwhile waits for the next payout.
    .lte("created_at", parsed.data.upto)
    .select("id");
  if (error) {
    console.error("[affiliates] payout failed", { id: parsed.data.id, error: error.message });
    back(`/admin/affiliates/${parsed.data.id}`, { error: "Could not mark the commissions paid." });
  }
  revalidatePath(`/admin/affiliates/${parsed.data.id}`);
  back(`/admin/affiliates/${parsed.data.id}`, { ok: `${data?.length ?? 0} commission${data?.length === 1 ? "" : "s"} marked paid.` });
}
