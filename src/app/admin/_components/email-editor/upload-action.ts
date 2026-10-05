"use server";

import { randomUUID } from "node:crypto";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { EMAIL_ASSETS_BUCKET, emailImagePath, sniffImageType, validateEmailImage } from "./upload-rules";

export type UploadEmailImageResult = { url: string } | { error: string };

/**
 * Uploads an image for an email (form field "file") to the public email-assets bucket and returns
 * its public URL. Sales staff only. The file's bytes must match its declared image type.
 */
export async function uploadEmailImage(formData: FormData): Promise<UploadEmailImageResult> {
  const { user } = await requireStaff("sales");

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Choose an image to upload." };
  const invalid = validateEmailImage({ type: file.type, size: file.size });
  if (invalid) return { error: invalid };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type || type !== file.type) return { error: "That file doesn't look like a valid image. Try exporting it again as PNG or JPG." };

  const path = emailImagePath(new Date(), randomUUID(), type);
  try {
    const storage = createServiceClient().storage.from(EMAIL_ASSETS_BUCKET);
    const { error } = await storage.upload(path, bytes, { contentType: type, cacheControl: "31536000", upsert: false });
    if (error) {
      console.error("[email images] upload failed", { userId: user.id, path, error: error.message });
      return { error: "Could not upload the image. Please try again." };
    }
    return { url: storage.getPublicUrl(path).data.publicUrl };
  } catch (err) {
    console.error("[email images] upload threw", { userId: user.id, path, error: err instanceof Error ? err.message : String(err) });
    return { error: "Could not upload the image. Please try again." };
  }
}
