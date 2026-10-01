"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { COURSE_IMAGES_BUCKET, validateCourseImage } from "@/lib/lesson-files";
import { isLessonThumbnailPath, lessonThumbnailPath, lessonThumbnailPathFromUrl } from "@/lib/content/lesson-thumbnail";
import { revalidateCourseContent } from "@/app/admin/courses/revalidate";

/**
 * Custom lesson thumbnail (Kajabi "Lesson thumbnail"): the browser uploads straight to the public
 * course-images bucket with a server-signed URL, then the lesson points at it. The DB trigger makes
 * the upload win over the Vimeo thumbnail; removing it falls back to Vimeo.
 */
export type ThumbnailResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const Ids = z.object({ courseId: z.string().min(1).max(100), lessonId: z.string().uuid() });
const Start = Ids.extend({ fileName: z.string().min(1).max(255), size: z.number().int().nonnegative(), contentType: z.string().max(100) });
const Finish = Ids.extend({ path: z.string().min(1).max(300) });

type ServiceClient = ReturnType<typeof createServiceClient>;

function publicBase(sb: ServiceClient): string {
  return sb.storage.from(COURSE_IMAGES_BUCKET).getPublicUrl("").data.publicUrl;
}

async function loadLesson(sb: ServiceClient, courseId: string, lessonId: string): Promise<{ thumbnail_upload_url: string | null } | null> {
  const { data, error } = await sb
    .from("lessons")
    .select("thumbnail_upload_url")
    .eq("id", lessonId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (error) console.error("lesson thumbnail: lesson load failed", { lessonId, error: error.message });
  return data;
}

/** Best effort: a leftover object costs storage, never correctness. */
async function removeStoredThumbnail(sb: ServiceClient, url: string | null, lessonId: string): Promise<void> {
  const path = lessonThumbnailPathFromUrl(url, publicBase(sb), lessonId);
  if (!path) return;
  const { error } = await sb.storage.from(COURSE_IMAGES_BUCKET).remove([path]);
  if (error) console.error("lesson thumbnail: old image cleanup failed", { lessonId, path, error: error.message });
}

export async function startLessonThumbnailUpload(input: z.input<typeof Start>): Promise<ThumbnailResult<{ path: string; token: string }>> {
  await requireStaff("content");
  const parsed = Start.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid upload." };
  const { courseId, lessonId, fileName, size, contentType } = parsed.data;
  const invalid = validateCourseImage({ name: fileName, size, type: contentType });
  if (invalid) return { ok: false, error: invalid };

  const sb = createServiceClient();
  if (!(await loadLesson(sb, courseId, lessonId))) return { ok: false, error: "Lesson not found." };
  const { data, error } = await sb.storage.from(COURSE_IMAGES_BUCKET).createSignedUploadUrl(lessonThumbnailPath(lessonId, fileName, randomUUID()));
  if (error || !data) {
    console.error("lesson thumbnail: upload url failed", { lessonId, error: error?.message });
    return { ok: false, error: "Could not start the upload. Please try again." };
  }
  return { ok: true, data: { path: data.path, token: data.token } };
}

/** Points the lesson at the uploaded image and deletes the image it replaces. */
export async function finishLessonThumbnailUpload(input: z.input<typeof Finish>): Promise<ThumbnailResult<{ url: string }>> {
  await requireStaff("content");
  const parsed = Finish.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid upload." };
  const { courseId, lessonId, path } = parsed.data;
  if (!isLessonThumbnailPath(path, lessonId)) return { ok: false, error: "Invalid upload." };

  const sb = createServiceClient();
  const lesson = await loadLesson(sb, courseId, lessonId);
  if (!lesson) return { ok: false, error: "Lesson not found." };
  const url = sb.storage.from(COURSE_IMAGES_BUCKET).getPublicUrl(path).data.publicUrl;
  const { error } = await sb.from("lessons").update({ thumbnail_upload_url: url }).eq("id", lessonId).eq("course_id", courseId);
  if (error) {
    console.error("lesson thumbnail: save failed", { lessonId, error: error.message });
    return { ok: false, error: "The image uploaded but could not be set as the thumbnail. Please try again." };
  }
  if (lesson.thumbnail_upload_url !== url) await removeStoredThumbnail(sb, lesson.thumbnail_upload_url, lessonId);
  revalidateCourseContent(courseId, lessonId);
  return { ok: true, data: { url } };
}

/** Drops the custom image; members see the Vimeo thumbnail again (or none). */
export async function removeLessonThumbnail(input: z.input<typeof Ids>): Promise<ThumbnailResult<{ fallbackUrl: string | null }>> {
  await requireStaff("content");
  const parsed = Ids.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  const { courseId, lessonId } = parsed.data;

  const sb = createServiceClient();
  const lesson = await loadLesson(sb, courseId, lessonId);
  if (!lesson) return { ok: false, error: "Lesson not found." };
  const { data, error } = await sb
    .from("lessons")
    .update({ thumbnail_upload_url: null })
    .eq("id", lessonId)
    .eq("course_id", courseId)
    .select("thumbnail_url")
    .single();
  if (error) {
    console.error("lesson thumbnail: remove failed", { lessonId, error: error.message });
    return { ok: false, error: "Could not remove the thumbnail. Please try again." };
  }
  await removeStoredThumbnail(sb, lesson.thumbnail_upload_url, lessonId);
  revalidateCourseContent(courseId, lessonId);
  return { ok: true, data: { fallbackUrl: (data?.thumbnail_url as string | null) ?? null } };
}
