"use server";

import { redirect } from "next/navigation";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { siteSettingsForm, socialFromForm } from "@/lib/site-settings";
import { SITE_SETTINGS_TAG } from "@/lib/site-settings-server";

const PAGE = "/admin/settings/general";

function back(params: Record<string, string>): never {
  redirect(`${PAGE}?${new URLSearchParams(params).toString()}`);
}

export async function saveSiteSettings(formData: FormData): Promise<void> {
  const { user } = await requireStaff("settings");
  const parsed = siteSettingsForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back({ error: parsed.error.issues[0].message });
  const { academy_name, contact_email } = parsed.data;
  const { error } = await createServiceClient()
    .from("site_settings")
    .upsert({ id: 1, academy_name, contact_email, social: socialFromForm(parsed.data), updated_at: new Date().toISOString(), updated_by: user.id });
  if (error) {
    console.error("[site settings] save failed", { error: error.message });
    back({ error: "Couldn't save. Try again." });
  }
  // The footer is on every public page.
  revalidateTag(SITE_SETTINGS_TAG, "max");
  revalidatePath("/", "layout");
  back({ saved: "1" });
}
