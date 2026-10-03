"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";

const PAGE = "/admin/settings/email";

const Settings = z.object({
  sender_name: z
    .string()
    .trim()
    .min(1, "Add a sender name.")
    .max(80, "The sender name can be up to 80 characters.")
    .refine((v) => !/["<>\r\n\\]/.test(v), "The sender name can't contain quotes or < >."),
  reply_to: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === "" || z.email().safeParse(v).success, "Reply-to must be an email address.")
    .transform((v) => v || null),
  postal_address: z
    .string()
    .trim()
    .max(300, "The address can be up to 300 characters.")
    .transform((v) => v || null),
});

function back(params: Record<string, string>): never {
  redirect(`${PAGE}?${new URLSearchParams(params).toString()}`);
}

export async function saveEmailSettings(formData: FormData): Promise<void> {
  await requireStaff("sales");
  const parsed = Settings.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back({ error: parsed.error.issues[0].message });
  const { error } = await createServiceClient()
    .from("email_settings")
    .upsert({ id: 1, ...parsed.data, updated_at: new Date().toISOString() });
  if (error) {
    console.error("[email settings] save failed", { error: error.message });
    back({ error: "Couldn't save. Try again." });
  }
  revalidatePath(PAGE);
  back({ saved: "1" });
}
