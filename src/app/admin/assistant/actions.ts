"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { forgetAssistantSettings } from "@/lib/assistant/settings";
import { EXTRA_INSTRUCTIONS_MAX_CHARS } from "@/lib/assistant/types";

const PAGE = "/admin/assistant";

const checkbox = z
  .literal("on")
  .optional()
  .transform((v) => v === "on");

const Settings = z.object({
  members_enabled: checkbox,
  sales_enabled: checkbox,
  extra_instructions: z
    .string()
    .trim()
    .max(EXTRA_INSTRUCTIONS_MAX_CHARS, `Keep the instructions under ${EXTRA_INSTRUCTIONS_MAX_CHARS} characters.`)
    .transform((v) => v || null),
});

function back(params: Record<string, string>): never {
  redirect(`${PAGE}?${new URLSearchParams(params).toString()}`);
}

/** The assistant's switches and the owner's tone instructions. */
export async function saveAssistantSettings(formData: FormData): Promise<void> {
  await requireStaff("content");
  const parsed = Settings.safeParse({
    members_enabled: formData.get("members_enabled") ?? undefined,
    sales_enabled: formData.get("sales_enabled") ?? undefined,
    extra_instructions: formData.get("extra_instructions") ?? "",
  });
  if (!parsed.success) back({ error: parsed.error.issues[0]?.message ?? "Please check the form." });
  const { error } = await createServiceClient()
    .from("assistant_settings")
    .upsert({ id: 1, ...parsed.data, updated_at: new Date().toISOString() });
  if (error) {
    console.error("[assistant settings] save failed", { error: error.message });
    back({ error: "Couldn't save. Try again." });
  }
  forgetAssistantSettings();
  revalidatePath(PAGE);
  back({ saved: "1" });
}
