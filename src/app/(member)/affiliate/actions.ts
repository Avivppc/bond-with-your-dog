"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { fail, ok, type ActionResult } from "@/lib/member/result";
import { affiliateForMember } from "@/lib/affiliates/server";
import { checkAffiliateCouponCode } from "@/lib/affiliates/rules";

/** The affiliate's own discount code: their wording, the discount the team set, one per affiliate. */
export async function createMyCouponCode(raw: string): Promise<ActionResult<{ code: string }>> {
  const input = z.string().max(80).safeParse(raw);
  if (!input.success) return fail("Type the code you'd like.");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Please sign in again.");
  const affiliate = await affiliateForMember({ id: user.id, email: user.email, emailConfirmed: Boolean(user.email_confirmed_at) });
  if (!affiliate) return fail("This is only for Bonded affiliates.");
  if (!affiliate.active) return fail("Your affiliate account is paused. Write to us from Help.");
  if (!affiliate.coupon_percent) return fail("Discount codes aren't set up for you yet. Write to us from Help.");

  const checked = checkAffiliateCouponCode(input.data);
  if (!checked.ok) return fail(checked.reason);
  const { error } = await createServiceClient().from("coupons").insert({
    code: checked.code,
    percent_off: affiliate.coupon_percent,
    affiliate_id: affiliate.id,
    created_by: user.id,
  });
  if (error) {
    if (error.code === "23505") return fail(error.message.includes("coupons_affiliate_key") ? "You already have a code. Refresh the page to see it." : "That code is taken. Try another one.");
    console.error("[affiliate] code create failed", { affiliateId: affiliate.id, error: error.message });
    return fail("Couldn't create the code. Please try again.");
  }
  revalidatePath("/affiliate");
  revalidatePath("/admin/coupons");
  return ok({ code: checked.code });
}
