"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";

const percent = (name: string) =>
  z.coerce
    .number({ message: `${name} must be a number.` })
    .int(`${name} must be a whole number.`)
    .min(0, `${name} must be between 0 and 100.`)
    .max(100, `${name} must be between 0 and 100.`);

const paddleDiscount = z
  .string()
  .trim()
  .max(100, "That Paddle discount id is too long.")
  .refine((v) => v === "" || /^dsc_[a-z0-9]+$/i.test(v), "Paddle discount ids look like dsc_…")
  .transform((v) => v || null);

const Settings = z.object({
  enabled: z.preprocess((v) => v === "on", z.boolean()),
  friend_discount_percent: percent("Friend discount"),
  friend_paddle_discount_id: paddleDiscount,
  reward_percent: percent("Referrer reward"),
  reward_paddle_discount_id: paddleDiscount,
  attribution_days: z.coerce
    .number({ message: "Days to buy must be a number." })
    .int("Days to buy must be a whole number.")
    .min(1, "Days to buy: between 1 and 365.")
    .max(365, "Days to buy: between 1 and 365."),
  description: z
    .string()
    .trim()
    .max(500, "The text can be up to 500 characters.")
    .transform((v) => v || null),
});

function back(params: Record<string, string>): never {
  redirect(`/admin/referrals?${new URLSearchParams(params).toString()}`);
}

export async function saveReferralSettings(formData: FormData): Promise<void> {
  await requireStaff("sales");
  const parsed = Settings.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back({ error: parsed.error.issues[0].message });
  const { data, error } = await createServiceClient()
    .from("referral_settings")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select("id");
  if (error || !data?.length) {
    console.error("[referrals] settings save failed", error?.message ?? "settings row missing");
    back({ error: "Could not save the settings. Please try again." });
  }
  revalidatePath("/admin/referrals");
  revalidatePath("/refer");
  back({ saved: "1" });
}
