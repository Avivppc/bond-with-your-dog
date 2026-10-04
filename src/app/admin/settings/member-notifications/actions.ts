"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { pushSoon } from "@/lib/push/server";
import { fillTemplate, notificationSettingsSchema, sampleVars, TITLE_MAX, BODY_MAX, TOPIC_DEF, TOPICS, unknownTags, type NotificationSettings } from "@/lib/notification-settings/topics";

export type SettingsResult = { ok: true } | { ok: false; error: string };

/** Saves every notification setting at once; takes effect for the next notification sent. */
export async function saveMemberNotificationSettings(input: NotificationSettings): Promise<SettingsResult> {
  const { user } = await requireStaff("content");
  const parsed = notificationSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the settings." };

  const { error } = await createServiceClient()
    .from("notification_settings")
    .upsert({ id: 1, settings: parsed.data, updated_by: user.id, updated_at: new Date().toISOString() });
  if (error) {
    console.error("[member-notifications] save failed", error.message);
    return { ok: false, error: "Could not save. Please try again." };
  }
  revalidatePath("/admin/settings/member-notifications");
  return { ok: true };
}

const Test = z.object({
  topic: z.enum(TOPICS),
  title: z.string().trim().min(1, "Write a title first.").max(TITLE_MAX),
  body: z.string().trim().max(BODY_MAX),
});

/**
 * "Send me a test": the wording on screen (saved or not), filled with sample values, to the
 * signed-in team member's bell and phone.
 */
export async function sendTestNotification(input: z.input<typeof Test>): Promise<SettingsResult> {
  const { user } = await requireStaff("content");
  const parsed = Test.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the text." };
  const { topic, title, body } = parsed.data;
  const bad = unknownTags(`${title} ${body}`, topic);
  if (bad.length) return { ok: false, error: `{{${bad[0]}}} isn't available for this notification.` };

  const vars = sampleVars(topic);
  // No topic on the row: a test always reaches the phone, whatever the switches say.
  const { error } = await createServiceClient()
    .from("notifications")
    .insert({
      user_id: user.id,
      kind: "system",
      title: `Test: ${fillTemplate(title, vars) || TOPIC_DEF[topic].label}`.slice(0, 160),
      body: fillTemplate(body, vars).slice(0, 400) || null,
      href: TOPIC_DEF[topic].href,
    });
  if (error) {
    console.error("[member-notifications] test failed", error.message);
    return { ok: false, error: "Could not send the test." };
  }
  pushSoon(user.id);
  return { ok: true };
}
