"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { notifyPrefsFromForm } from "@/lib/notifications";

const PAGE = "/admin/settings/notifications";

const TeamEmail = z
  .string()
  .trim()
  .max(200)
  .refine((v) => v === "" || z.email().safeParse(v).success, "The team email must be an email address.")
  .transform((v) => v || null);

function back(params: Record<string, string>): never {
  redirect(`${PAGE}?${new URLSearchParams(params).toString()}`);
}

export async function saveNotificationSettings(formData: FormData): Promise<void> {
  await requireStaff("sales");
  const form = Object.fromEntries(formData);
  const teamEmail = TeamEmail.safeParse(form.team_email ?? "");
  if (!teamEmail.success) back({ error: teamEmail.error.issues[0].message });
  // Update, not upsert: the row also holds Settings → Email, which this form must not touch.
  const { data, error } = await createServiceClient()
    .from("email_settings")
    .update({ team_email: teamEmail.data, notify: notifyPrefsFromForm(form), updated_at: new Date().toISOString() })
    .eq("id", 1)
    .select("id");
  if (error || !data?.length) {
    console.error("[notification settings] save failed", { error: error?.message ?? "no settings row" });
    back({ error: "Couldn't save. Try again." });
  }
  revalidatePath(PAGE);
  back({ saved: "1" });
}
