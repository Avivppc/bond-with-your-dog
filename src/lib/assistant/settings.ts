import "server-only";
import type { createServiceClient } from "@/lib/supabase/admin";
import { DISABLED_SETTINGS, type AssistantSettings } from "./types";

/** The assistant_settings row (service role). Cached briefly so every chat message doesn't re-read it. */

type ServiceClient = ReturnType<typeof createServiceClient>;

const SETTINGS_TTL_MS = 30 * 1000;

let cached: { at: number; settings: AssistantSettings } | null = null;

/** Fresh from the database; switched off when it can't be read (fail closed). */
export async function readAssistantSettings(sb: ServiceClient): Promise<AssistantSettings> {
  const { data, error } = await sb.from("assistant_settings").select("members_enabled, sales_enabled, extra_instructions").eq("id", 1).maybeSingle();
  if (error) {
    console.error("[assistant] settings load failed", { error: error.message });
    return DISABLED_SETTINGS;
  }
  if (!data) return DISABLED_SETTINGS;
  return {
    membersEnabled: Boolean(data.members_enabled),
    salesEnabled: Boolean(data.sales_enabled),
    extraInstructions: (data.extra_instructions as string | null) ?? null,
  };
}

export async function loadAssistantSettings(sb: ServiceClient, now: number = Date.now()): Promise<AssistantSettings> {
  if (cached && now - cached.at < SETTINGS_TTL_MS) return cached.settings;
  const settings = await readAssistantSettings(sb);
  cached = { at: now, settings };
  return settings;
}

/** After the admin saves (this server instance; others pick it up within the TTL). */
export function forgetAssistantSettings(): void {
  cached = null;
}
