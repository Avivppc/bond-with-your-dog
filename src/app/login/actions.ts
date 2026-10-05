"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/safe-next";
import { cookies } from "next/headers";
import { REFERRAL_COOKIE } from "@/lib/referrals";
import { claimReferralCode } from "@/lib/referrals-server";
import { sendStaffConfirmLink } from "@/lib/auth/staff-invite-proof";

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  next: z.string().optional(),
});

export async function login(formData: FormData) {
  const next = safeNext(String(formData.get("next") ?? ""));
  const back = (error: string): never =>
    redirect(`/login?next=${encodeURIComponent(next)}&error=${encodeURIComponent(error)}`);
  const parsed = Schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });

  if (!parsed.success) {
    return back("Please check your email and password.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return back(error.message);
  }

  // Someone who followed a friend's referral link and then signed in is attributed now.
  const jar = await cookies();
  const referralCode = jar.get(REFERRAL_COOKIE)?.value;
  if (referralCode && (await claimReferralCode(supabase, referralCode))) jar.delete(REFERRAL_COOKIE);

  // An admin invitee who signed up without opening the invite gets a link that proves their inbox.
  if (data.user) await sendStaffConfirmLink(data.user, "sign-in");

  revalidatePath("/", "layout");
  redirect(next);
}
