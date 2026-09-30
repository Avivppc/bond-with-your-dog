"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { COURSE_IMAGES_BUCKET, validateCourseImage } from "@/lib/lesson-files";

export type ImageActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const Start = z.object({
  courseId: z.string().min(1).max(100),
  fileName: z.string().min(1).max(255),
  size: z.number().int().nonnegative(),
  contentType: z.string().max(100),
});

/** Validates the image and returns a one-time signed upload URL for the public bucket. */
export async function startCourseImageUpload(
  input: z.input<typeof Start>
): Promise<ImageActionResult<{ path: string; token: string }>> {
  await requireStaff("content");
  const parsed = Start.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid upload." };
  const { courseId, fileName, size, contentType } = parsed.data;
  const invalid = validateCourseImage({ name: fileName, size, type: contentType });
  if (invalid) return { ok: false, error: invalid };

  const ext = fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase();
  const path = `${courseId.replace(/[^a-z0-9-]/g, "")}/${randomUUID()}.${ext}`;
  const { data, error } = await createServiceClient().storage.from(COURSE_IMAGES_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("course image upload url failed", { courseId, error: error?.message });
    return { ok: false, error: "Could not start the upload." };
  }
  return { ok: true, data: { path: data.path, token: data.token } };
}

const Finish = z.object({ courseId: z.string().min(1).max(100), path: z.string().min(1).max(300), alt: z.string().max(300) });

/** Sets the uploaded image as the course cover. */
export async function finishCourseImageUpload(input: z.input<typeof Finish>): Promise<ImageActionResult<{ url: string }>> {
  await requireStaff("content");
  const parsed = Finish.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid upload." };
  const { courseId, path, alt } = parsed.data;
  if (!path.startsWith(`${courseId.replace(/[^a-z0-9-]/g, "")}/`)) return { ok: false, error: "Invalid upload." };

  const sb = createServiceClient();
  const url = sb.storage.from(COURSE_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
  const { error } = await sb.from("courses").update({ image: url, image_alt: alt || null }).eq("id", courseId);
  if (error) {
    console.error("course image save failed", { courseId, error: error.message });
    return { ok: false, error: "Uploaded, but could not set the image." };
  }
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath(`/learn/${courseId}`);
  revalidatePath("/courses");
  return { ok: true, data: { url } };
}
