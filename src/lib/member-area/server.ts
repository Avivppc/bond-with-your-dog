import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { unstable_cache } from "next/cache";
import { createServiceClient } from "@/lib/supabase/admin";
import { DEFAULT_MEMBER_AREA, readMemberArea, type MemberAreaSettings } from "./settings";

/** Loading the member area settings: published for members, the draft in the editor's preview. */

export const MEMBER_AREA_TAG = "member-area";
/** Set by the editor (staff only, for a few hours): the member app shows the draft. */
export const MEMBER_PREVIEW_COOKIE = "bonded_member_preview";
export const MEMBER_PREVIEW_MAX_AGE = 4 * 60 * 60;
const SAFETY_REFRESH_SECONDS = 3600;

async function readPublished(): Promise<unknown> {
  const { data, error } = await createServiceClient().from("member_area").select("published").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.published ?? {};
}

const cachedPublished = unstable_cache(readPublished, ["member-area"], { tags: [MEMBER_AREA_TAG], revalidate: SAFETY_REFRESH_SECONDS });

export async function loadDraftMemberArea(): Promise<{ settings: MemberAreaSettings; rev: number; hasChanges: boolean }> {
  const { data, error } = await createServiceClient().from("member_area").select("draft, published, draft_rev, has_changes").eq("id", 1).maybeSingle();
  if (error) throw new Error(`member area unavailable: ${error.message}`);
  const draft = data?.draft && Object.keys(data.draft as object).length > 0 ? data.draft : data?.published;
  return { settings: readMemberArea(draft ?? {}), rev: data?.draft_rev ?? 1, hasChanges: data?.has_changes ?? false };
}

/** Whether this request asked for the draft (the staff check is the caller's). */
export async function wantsMemberPreview(): Promise<boolean> {
  return (await cookies()).get(MEMBER_PREVIEW_COOKIE)?.value === "1";
}

/**
 * The settings for this request: the draft when a staff member is previewing, else the published
 * ones (the built-in design if the database can't be reached). Cached per request.
 */
export const loadMemberArea = cache(async (isStaff: boolean): Promise<{ settings: MemberAreaSettings; preview: boolean }> => {
  try {
    if (isStaff && (await wantsMemberPreview())) return { settings: (await loadDraftMemberArea()).settings, preview: true };
    return { settings: readMemberArea(await cachedPublished()), preview: false };
  } catch (error: unknown) {
    console.error("[member area] load failed; using the built-in design", { error: error instanceof Error ? error.message : String(error) });
    return { settings: DEFAULT_MEMBER_AREA, preview: false };
  }
});
