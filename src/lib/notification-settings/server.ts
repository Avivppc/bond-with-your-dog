import "server-only";
import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/admin";
import { readNotificationSettings, type NotificationSettings } from "./topics";

/**
 * The team's notification settings (Admin → Member notifications), read once per request. A
 * failed read falls back to the defaults, so reminders and replies still go out as before.
 */
export const loadNotificationSettings = cache(async (): Promise<NotificationSettings> => {
  const { data, error } = await createServiceClient().from("notification_settings").select("settings").eq("id", 1).maybeSingle();
  if (error) console.error("[notification-settings] load failed", error.message);
  return readNotificationSettings(data?.settings ?? null);
});
