"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Email = z.string().trim().email();

/** The site the visitor is on (preview or production). Supabase only follows allow-listed redirect URLs. */
async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Emails a reset link. Always reports "sent" so the form doesn't reveal which emails have accounts. */
export async function requestPasswordReset(formData: FormData): Promise<void> {
  const email = Email.safeParse(formData.get("email"));
  if (!email.success) redirect("/forgot-password?error=Please+enter+a+valid+email.");

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${await requestOrigin()}/auth/callback?next=/reset-password`,
  });
  if (error) console.error("[forgot-password] reset email failed", error.message);
  redirect("/forgot-password?sent=1");
}
