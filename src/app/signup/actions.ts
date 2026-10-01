"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/safe-next";
import { createVerifyLink } from "@/lib/auth/email-verification";
import { sendEmail } from "@/lib/email";
import { welcomeEmail } from "@/lib/welcome-email";

const Schema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  marketing_opt_in: z.boolean(),
});

export async function signup(formData: FormData) {
  const next = safeNext(String(formData.get("next") ?? ""));
  const nextParam = `next=${encodeURIComponent(next)}`;
  const parsed = Schema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    marketing_opt_in: formData.get("marketing_opt_in") === "yes",
  });

  if (!parsed.success) {
    redirect(
      `/signup?${nextParam}&error=` +
        encodeURIComponent("Please fill in all fields (password must be 8+ characters).")
    );
  }

  const supabase = await createClient();
  const h = await headers();
  const origin = h.get("origin") ?? "";

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Copied into public.profiles by the handle_new_user trigger.
      data: {
        full_name: parsed.data.full_name,
        marketing_opt_in: parsed.data.marketing_opt_in,
      },
      emailRedirectTo: `${origin}/auth/callback?${nextParam}`,
    },
  });

  if (error) {
    redirect(`/signup?${nextParam}&error=` + encodeURIComponent(error.message));
  }

  // No session means "Confirm email" is still on in Supabase: keep the old flow working.
  if (!data.session) {
    redirect(
      `/signup?${nextParam}&message=` +
        encodeURIComponent("Check your email to confirm your account, then sign in.")
    );
  }

  // Welcome (with the confirm-your-email link) goes out after the redirect, so the
  // member lands in the app without waiting on Supabase or Resend.
  const { email, full_name: fullName } = parsed.data;
  after(async () => {
    const verifyUrl = await createVerifyLink(email, origin);
    await sendEmail(welcomeEmail({ to: email, fullName, baseUrl: origin, verifyUrl }));
  });

  revalidatePath("/", "layout");
  // New members have no onboarded_at, so /home sends them on to /welcome.
  redirect(next);
}
