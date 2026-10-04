"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { libraryPublicBases, loadMediaLibrary, storeLibraryImage, type MediaItem } from "@/lib/media/server";
import { isLibraryUrl, parseMediaSource } from "@/lib/media/sources";
import { revalidateCourseContent } from "@/app/admin/courses/revalidate";
import { COURSE_IMAGES_BUCKET } from "@/lib/lesson-files";
import { LESSON_THUMBNAIL_PREFIX, lessonThumbnailPathFromUrl } from "@/lib/content/lesson-thumbnail";

type Service = ReturnType<typeof createServiceClient>;

/**
 * A lesson's own thumbnail is deleted with that lesson. When one is picked for something else, use
 * a copy in course-images/shared/ (never deleted) so deleting the first lesson can't break it.
 */
async function lastingUrl(sb: Service, url: string): Promise<string | null> {
  const base = sb.storage.from(COURSE_IMAGES_BUCKET).getPublicUrl("").data.publicUrl;
  if (!url.startsWith(`${base}${LESSON_THUMBNAIL_PREFIX}`)) return url;
  const path = url.slice(base.length);
  const target = `shared/${randomUUID()}${path.slice(path.lastIndexOf("."))}`;
  const { error } = await sb.storage.from(COURSE_IMAGES_BUCKET).copy(path, target);
  if (error) {
    console.error("[media] copying a lesson thumbnail failed", {
      path,
      error: error.message,
    });
    return null;
  }
  return sb.storage.from(COURSE_IMAGES_BUCKET).getPublicUrl(target).data.publicUrl;
}

export type MediaResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const MAX_FILES = 20;
const PICKER_PAGE = 60;

/** Media library → Upload: one or more images (field "files"). */
export async function uploadMedia(formData: FormData): Promise<MediaResult<{ uploaded: number; errors: string[] }>> {
  const { user } = await requireStaff("content");
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { ok: false, error: "Choose one or more images." };
  if (files.length > MAX_FILES) return { ok: false, error: `Up to ${MAX_FILES} images at a time.` };
  const results = await Promise.all(files.map((f) => storeLibraryImage(user.id, f)));
  const errors = results.flatMap((r, i) => ("error" in r ? [`${files[i].name}: ${r.error}`] : []));
  revalidatePath("/admin/media");
  return {
    ok: true,
    data: { uploaded: results.length - errors.length, errors },
  };
}

const Search = z.object({
  search: z.string().trim().max(100).default(""),
  source: z.string().max(20).default("all"),
});

/** "Choose from library": the newest images matching a search. */
export async function listMediaForPicker(input: z.input<typeof Search>): Promise<MediaResult<MediaItem[]>> {
  await requireStaff("content");
  const parsed = Search.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid search." };
  const page = await loadMediaLibrary(parsed.data.search, parseMediaSource(parsed.data.source), 0, PICKER_PAGE);
  return page.failed ? { ok: false, error: "The library couldn't be loaded." } : { ok: true, data: page.items };
}

const Pick = z.object({
  courseId: z.string().min(1).max(100),
  url: z.string().url().max(500),
});

/** Course cover from the library (the library keeps the file; replacing the cover never deletes it). */
export async function setCourseImageFromLibrary(input: z.input<typeof Pick>): Promise<MediaResult<{ url: string }>> {
  await requireStaff("content");
  const parsed = Pick.safeParse(input);
  if (!parsed.success || !isLibraryUrl(parsed.data.url, libraryPublicBases())) return { ok: false, error: "Choose an image from the library." };
  const sb = createServiceClient();
  const url = await lastingUrl(sb, parsed.data.url);
  if (!url) return { ok: false, error: "Could not use that image. Please try again." };
  const { courseId } = parsed.data;
  const { data, error } = await sb.from("courses").update({ image: url }).eq("id", courseId).select("id");
  if (error || !data?.length) {
    console.error("[media] course image from library failed", {
      courseId,
      error: error?.message ?? "not found",
    });
    return { ok: false, error: "Could not set the image." };
  }
  revalidateCourseContent(courseId);
  return { ok: true, data: { url } };
}

const PickThumb = Pick.extend({ lessonId: z.string().uuid() });

/**
 * Lesson thumbnail from the library. The lesson's previous upload (in its own folder) is deleted,
 * as when a new one is uploaded; library files are never deleted with a lesson.
 */
export async function setLessonThumbnailFromLibrary(input: z.input<typeof PickThumb>): Promise<MediaResult<{ url: string }>> {
  await requireStaff("content");
  const parsed = PickThumb.safeParse(input);
  if (!parsed.success || !isLibraryUrl(parsed.data.url, libraryPublicBases())) return { ok: false, error: "Choose an image from the library." };
  const { courseId, lessonId } = parsed.data;
  const sb = createServiceClient();
  const { data: lesson } = await sb.from("lessons").select("thumbnail_upload_url").eq("id", lessonId).eq("course_id", courseId).maybeSingle();
  if (!lesson) return { ok: false, error: "Lesson not found." };
  const url = await lastingUrl(sb, parsed.data.url);
  if (!url) return { ok: false, error: "Could not use that image. Please try again." };
  const { error } = await sb.from("lessons").update({ thumbnail_upload_url: url }).eq("id", lessonId).eq("course_id", courseId);
  if (error) {
    console.error("[media] lesson thumbnail from library failed", {
      lessonId,
      error: error.message,
    });
    return { ok: false, error: "Could not set the thumbnail." };
  }
  const base = sb.storage.from(COURSE_IMAGES_BUCKET).getPublicUrl("").data.publicUrl;
  const oldPath = lessonThumbnailPathFromUrl(lesson.thumbnail_upload_url ?? null, base, lessonId);
  if (oldPath && oldPath !== url.slice(base.length)) {
    const { error: removeError } = await sb.storage.from(COURSE_IMAGES_BUCKET).remove([oldPath]);
    if (removeError)
      console.error("[media] old lesson thumbnail cleanup failed", {
        lessonId,
        error: removeError.message,
      });
  }
  revalidateCourseContent(courseId, lessonId);
  return { ok: true, data: { url } };
}
