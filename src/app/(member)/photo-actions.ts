"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { PROFILE_PHOTOS_BUCKET, profilePhotoPath, validateProfilePhoto } from "@/lib/member/photos";
import { fail, ok, type ActionResult } from "@/lib/member/result";

const Upload = z.object({ kind: z.enum(["avatar", "dog"]), size: z.number().int().nonnegative(), contentType: z.string().max(100) });

/** A signed upload URL for a profile or dog photo in the member's own folder (+ its public URL). */
export async function startProfilePhotoUpload(input: z.input<typeof Upload>): Promise<ActionResult<{ path: string; token: string; publicUrl: string }>> {
  const parsed = Upload.safeParse(input);
  if (!parsed.success) return fail("Invalid photo.");
  const invalid = validateProfilePhoto({ size: parsed.data.size, type: parsed.data.contentType });
  if (invalid) return fail(invalid);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Please sign in again.");

  const path = profilePhotoPath(user.id, parsed.data.kind, parsed.data.contentType, randomUUID());
  const storage = createServiceClient().storage.from(PROFILE_PHOTOS_BUCKET);
  const { data, error } = await storage.createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[photos] signed upload failed", { userId: user.id, error: error?.message });
    return fail("Could not start the upload. Please try again.");
  }
  return ok({ path: data.path, token: data.token, publicUrl: storage.getPublicUrl(data.path).data.publicUrl });
}
