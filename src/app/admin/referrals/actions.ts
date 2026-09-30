"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";

const percent = z.coerce.number().int().min(0, "Percent must be 0–100").max(100, "Percent must be 0–100");
const paddleDiscount = z
  .string()
  .trim()
  .max(100)
  .refine((v) => v === "" || /^dsc_[a-z0-9]+$/i.test(v), "Paddle discount ids look like dsc_…")
  .transform((v) => v || null);

const Settings = z.object({
  enabled: z.preprocess((v) => v === "on", z.boolean()),
  friend_discount_percent: percent,
  friend_paddle_discount_id: paddleDiscount,
  reward_percent: percent,
  reward_paddle_discount_id: paddleDiscount,
  attribution_days: z.coerce.number().int().min(1, "Between 1 and 365 days").max(365, "Between 1 and 365 days"),
  description: z
    .string()
    .trim()
    .max(500)
    .transform((v) => v || null),
});

function back(params: Record<string, string>): never {
  redirect(`/admin/referrals?${new URLSearchParams(params).toString()}`);
}

export async function saveReferralSettings(formData: FormData): Promise<void> {
  await requireStaff("sales");
  const parsed = Settings.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back({ error: parsed.error.issues[0].message });
  const { error } = await createServiceClient()
    .from("referral_settings")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) {
    console.error("[referrals] settings save failed", error.message);
    back({ error: "Could not save the settings." });
  }
  revalidatePath("/admin/referrals");
  revalidatePath("/refer");
  back({ saved: "1" });
}
