"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const NewPassword = z
  .object({ password: z.string().min(8, "Use at least 8 characters.").max(72), confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "The two passwords don't match." });

/** Supabase auth error codes a person can act on. */
const FRIENDLY_ERRORS: Record<string, string> = {
  same_password: "That's your current password — choose a different one.",
  weak_password: "That password is too easy to guess. Try a longer one.",
};

/** Sets a new password for the user signed in by the reset link (see /forgot-password). */
export async function updatePassword(formData: FormData): Promise<void> {
  const parsed = NewPassword.safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) redirect(`/reset-password?error=${encodeURIComponent(parsed.error.issues[0].message)}`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/forgot-password?error=That+link+has+expired.+Request+a+new+one.");

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    console.error("[reset-password] update failed", error.message);
    redirect(`/reset-password?error=${encodeURIComponent(FRIENDLY_ERRORS[error.code ?? ""] ?? "We couldn't save the new password. Please try again.")}`);
  }
  redirect("/dashboard");
}
