"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { notifyAccessGranted } from "@/lib/payments/billing";
import { sendEmail, siteUrl } from "@/lib/email";

function back(params: Record<string, string>): never {
  redirect(`/admin/students?${new URLSearchParams(params).toString()}`);
}

const GrantSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  offer_id: z.string().uuid("Choose an offer"),
  days: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().positive().nullable()),
});

/**
 * Grants an offer to an email. Existing accounts get access now; otherwise the grant
 * waits in access_invites and is claimed when they sign up with that (verified) email.
 */
export async function grantAccessByEmail(formData: FormData): Promise<void> {
  const { user: staff } = await requireStaff("sales");
  const parsed = GrantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back({ error: parsed.error.issues[0].message });
  const { email, offer_id: offerId, days } = parsed.data;

  const sb = createServiceClient();
  const { data: userId, error: lookupError } = await sb.rpc("find_user_id_by_email", { p_email: email });
  if (lookupError) {
    console.error("[students] user lookup failed", { email, error: lookupError.message });
    back({ error: "Could not look up that email." });
  }

  if (typeof userId === "string") {
    const expiresAt = days ? new Date(Date.now() + days * 86_400_000).toISOString() : null;
    const { error } = await sb.rpc("grant_offer_access", {
      p_user_id: userId,
      p_offer_id: offerId,
      p_source: "grant",
      p_order_id: null,
      p_expires_at: expiresAt,
    });
    if (error) {
      console.error("[students] grant failed", { email, offerId, error: error.message });
      back({ error: "Could not grant access." });
    }
    await notifyAccessGranted(userId, offerId);
    revalidatePath("/admin/students");
    back({ ok: `Access granted to ${email}.` });
  }

  const { error: inviteError } = await sb
    .from("access_invites")
    .insert({ email, offer_id: offerId, days_of_access: days, invited_by: staff.id });
  if (inviteError && inviteError.code !== "23505") {
    console.error("[students] access invite failed", { email, error: inviteError.message });
    back({ error: "Could not save the invitation." });
  }
  await sendEmail({
    to: email,
    subject: "You've been given access to Bonded",
    text: [
      "Hi,",
      "",
      "You've been given access to a Bonded course.",
      `Create your account with this email address at ${siteUrl()}/signup — your course will be waiting in your dashboard.`,
      "",
      "The Bonded team",
    ].join("\n"),
  });
  revalidatePath("/admin/students");
  back({ ok: `${email} doesn't have an account yet — access will unlock when they sign up with this email.` });
}

const RevokeSchema = z.object({ user_id: z.string().uuid(), course_id: z.string().min(1).max(100) });

/** Ends a student's access to one course now (keeps their progress for a later re-grant). */
export async function revokeCourseAccess(formData: FormData): Promise<void> {
  await requireStaff("sales");
  const parsed = RevokeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back({ error: "Invalid request." });
  const { error } = await createServiceClient()
    .from("enrollments")
    .update({ expires_at: new Date().toISOString() })
    .eq("user_id", parsed.data.user_id)
    .eq("course_id", parsed.data.course_id);
  if (error) {
    console.error("[students] revoke failed", { ...parsed.data, error: error.message });
    back({ error: "Could not revoke access." });
  }
  revalidatePath("/admin/students");
  back({ ok: "Access revoked." });
}

const RevokeInviteSchema = z.object({ id: z.string().uuid() });

export async function cancelAccessInvite(formData: FormData): Promise<void> {
  await requireStaff("sales");
  const parsed = RevokeInviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back({ error: "Invalid request." });
  const { error } = await createServiceClient().from("access_invites").delete().eq("id", parsed.data.id).is("claimed_at", null);
  if (error) back({ error: "Could not cancel the invitation." });
  revalidatePath("/admin/students");
  back({ ok: "Invitation canceled." });
}
