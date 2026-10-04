"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { consentEvidence, requestCountry } from "@/lib/auth/marketing-consent";
import { createClient } from "@/lib/supabase/server";
import { isNotifPrefKey, withNotifPref } from "@/lib/feedback/prefs";
import { requestOrigin } from "@/lib/feedback/request-origin";
import { deleteAccountData } from "@/lib/feedback/account-deletion";
import { TimeZoneInput } from "@/lib/reminders/timezone-input";

export type SettingsResult = { ok: true; message?: string } | { ok: false; error: string };

const TRY_AGAIN = "That didn't save. Please try again.";

async function signedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/settings");
  return { supabase, user };
}

const Pref = z.object({ key: z.string(), value: z.boolean() });

/** One notification switch (profiles.notif_prefs), keeping the other stored keys. */
export async function setNotifPref(input: z.input<typeof Pref>): Promise<SettingsResult> {
  const parsed = Pref.safeParse(input);
  if (!parsed.success || !isNotifPrefKey(parsed.data.key)) return { ok: false, error: "Unknown setting." };
  const { supabase, user } = await signedIn();
  const { data, error: readError } = await supabase.from("profiles").select("notif_prefs").eq("id", user.id).maybeSingle();
  if (readError) {
    console.error("[settings] prefs read failed", readError.message);
    return { ok: false, error: TRY_AGAIN };
  }
  const next = withNotifPref(data?.notif_prefs, parsed.data.key, parsed.data.value);
  const { error } = await supabase.from("profiles").update({ notif_prefs: next }).eq("id", user.id);
  if (error) {
    console.error("[settings] prefs update failed", error.message);
    return { ok: false, error: TRY_AGAIN };
  }
  revalidatePath("/settings");
  return { ok: true };
}

/** The time zone reminders use (practice days and Live Q&A times). */
export async function setTimeZone(timeZone: string): Promise<SettingsResult> {
  const parsed = TimeZoneInput.safeParse(timeZone);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please pick a time zone from the list." };
  const { supabase, user } = await signedIn();
  const { error } = await supabase.from("profiles").update({ timezone: parsed.data }).eq("id", user.id);
  if (error) {
    console.error("[settings] time zone update failed", { userId: user.id, error: error.message });
    return { ok: false, error: TRY_AGAIN };
  }
  revalidatePath("/settings");
  return { ok: true };
}

/** The Bonded newsletter (marketing consent, with the time and place it was given; turning it off clears them). */
export async function setNewsletter(value: boolean): Promise<SettingsResult> {
  if (typeof value !== "boolean") return { ok: false, error: "Unknown setting." };
  const { supabase, user } = await signedIn();
  const proof = value ? consentEvidence("settings", requestCountry(await headers())) : {};
  const { error } = await supabase
    .from("profiles")
    .update({ marketing_opt_in: value, marketing_opt_in_at: value ? new Date().toISOString() : null, ...proof })
    .eq("id", user.id);
  if (error) {
    console.error("[settings] newsletter update failed", error.message);
    return { ok: false, error: TRY_AGAIN };
  }
  revalidatePath("/settings");
  return { ok: true };
}

/** Emails a link to set a new password (the same flow as "Forgot password"). */
export async function sendPasswordReset(): Promise<SettingsResult> {
  const { supabase, user } = await signedIn();
  if (!user.email) return { ok: false, error: "Your account has no email address." };
  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${await requestOrigin()}/auth/callback?next=/reset-password`,
  });
  if (error) {
    console.error("[settings] reset email failed", error.message);
    return { ok: false, error: "We couldn't send the email. Please try again in a minute." };
  }
  return { ok: true, message: `We sent a reset link to ${user.email}` };
}

const Email = z.string().trim().toLowerCase().email("Please enter a valid email.");

/** Starts an email change; Supabase asks for confirmation before it takes effect. */
export async function changeEmail(email: string): Promise<SettingsResult> {
  const parsed = Email.safeParse(email);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please enter a valid email." };
  const { supabase, user } = await signedIn();
  if (parsed.data === user.email?.toLowerCase()) return { ok: false, error: "That's already your email." };
  const { error } = await supabase.auth.updateUser(
    { email: parsed.data },
    { emailRedirectTo: `${await requestOrigin()}/auth/callback?next=/settings` }
  );
  if (error) {
    console.error("[settings] email change failed", error.message);
    return { ok: false, error: error.message.includes("already") ? "That email is already used by another account." : TRY_AGAIN };
  }
  return { ok: true, message: `Check ${parsed.data} (and your current inbox) to confirm the change.` };
}

/** Deletes the member's account for good, after they typed DELETE. */
export async function deleteAccount(confirmation: string): Promise<SettingsResult> {
  if (confirmation.trim() !== "DELETE") return { ok: false, error: "Type DELETE to confirm." };
  const { supabase, user } = await signedIn();
  const result = await deleteAccountData(user.id);
  if (!result.ok) return { ok: false, error: result.error };
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) console.error("[settings] sign-out after delete failed", error.message);
  redirect("/account-deleted");
}
