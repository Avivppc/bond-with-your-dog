import "server-only";
import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/admin";
import { DEFAULT_SITE_SETTINGS, readSocial, type SiteSettings } from "./site-settings";

/** Revalidate this tag after saving Settings → General. */
export const SITE_SETTINGS_TAG = "site-settings";

/** Throws on failure so a failed read is never cached. */
async function readSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await createServiceClient().from("site_settings").select("academy_name, contact_email, social").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return DEFAULT_SITE_SETTINGS;
  return { academyName: data.academy_name, contactEmail: data.contact_email, social: readSocial(data.social) };
}

const cachedSiteSettings = unstable_cache(readSiteSettings, ["site-settings"], { tags: [SITE_SETTINGS_TAG] });

async function withDefaults(read: () => Promise<SiteSettings>): Promise<SiteSettings> {
  try {
    return await read();
  } catch (error: unknown) {
    // The public site must render even when the database is unreachable (or at build time).
    console.error("[site settings] load failed; using defaults", { error: error instanceof Error ? error.message : String(error) });
    return DEFAULT_SITE_SETTINGS;
  }
}

/** Cached across requests (the footer is on every public page); saving the settings refreshes it. */
export function loadSiteSettings(): Promise<SiteSettings> {
  return withDefaults(cachedSiteSettings);
}

/** Uncached, for the admin form. */
export function loadSiteSettingsFresh(): Promise<SiteSettings> {
  return withDefaults(readSiteSettings);
}
