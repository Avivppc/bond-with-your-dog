import "server-only";
import type { createServiceClient } from "@/lib/supabase/admin";
import { STORY_MEDIA_BUCKET } from "@/lib/community/story-media";

type Service = ReturnType<typeof createServiceClient>;

/** Per run; the hourly job catches up on anything left. */
const BATCH = 200;

/**
 * Deletes photos visitors uploaded on "Share your story" but never sent (older than a day), then
 * their upload tickets. Returns how many were removed; never throws (it runs inside the reminders job).
 */
export async function cleanStaleStoryUploads(sb: Service): Promise<number> {
  try {
    const { data, error } = await sb.rpc("stale_story_uploads", { p_limit: BATCH });
    if (error) {
      console.error("[stories] stale uploads lookup failed", error.message);
      return 0;
    }
    const paths = (data ?? []) as string[];
    if (paths.length === 0) return 0;
    const { error: removeError } = await sb.storage.from(STORY_MEDIA_BUCKET).remove(paths);
    if (removeError) {
      // Keep the tickets so the next run tries again.
      console.error("[stories] stale uploads delete failed", { count: paths.length, error: removeError.message });
      return 0;
    }
    const { error: ticketError } = await sb.from("story_upload_tickets").delete().in("path", paths);
    if (ticketError) console.error("[stories] stale tickets delete failed", ticketError.message);
    return paths.length;
  } catch (error: unknown) {
    console.error("[stories] stale uploads clean-up failed", { error: error instanceof Error ? error.message : String(error) });
    return 0;
  }
}
