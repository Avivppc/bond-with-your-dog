"use client";

import { createClient } from "@/lib/supabase/client";
import type { ActionResult } from "@/lib/member/result";
import { STORY_MEDIA_BUCKET, storyPhotoType, validateStoryPhoto } from "./story-media";

export interface UploadedStoryPhoto {
  path: string;
  /** Local object URL for the thumbnail; null when the browser can't show the format (HEIC). */
  preview: string | null;
  name: string;
}

/** The server action that hands out a signed upload URL (members' or visitors'). */
export type StartStoryPhotoUpload = (input: { fileName: string; size: number; contentType: string }) => Promise<
  ActionResult<{ path: string; token: string; contentType: string }>
>;

/** Uploads one photo straight to storage through a signed URL; returns it or an error message. */
export async function uploadStoryPhoto(file: File, start: StartStoryPhotoUpload): Promise<{ photo: UploadedStoryPhoto } | { error: string }> {
  const invalid = validateStoryPhoto(file);
  const contentType = storyPhotoType(file);
  if (invalid || !contentType) return { error: invalid ?? "Use a JPG, PNG, WebP or HEIC photo." };
  const started = await start({ fileName: file.name, size: file.size, contentType });
  if (!started.ok) return { error: started.error };
  const { error } = await createClient()
    .storage.from(STORY_MEDIA_BUCKET)
    .uploadToSignedUrl(started.data.path, started.data.token, file, { contentType: started.data.contentType });
  if (error) {
    console.error("story photo upload failed", { error: error.message });
    return { error: "Upload failed. Please try again." };
  }
  const preview = contentType === "image/heic" ? null : URL.createObjectURL(file);
  return { photo: { path: started.data.path, preview, name: file.name } };
}
