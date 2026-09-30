"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { sanitizeLessonHtml } from "@/lib/sanitize";
import { parseVimeoUrl } from "@/lib/video/vimeo";
import { fetchVimeoMeta } from "@/lib/video/vimeo-oembed";
import { LESSON_FILES_BUCKET, lessonFilePath, validateLessonFile } from "@/lib/lesson-files";

/** Lesson content editing called from client components; returns results, never throws. */
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const Ids = z.object({ courseId: z.string().min(1).max(100), lessonId: z.string().uuid() });
const MAX_BODY_CHARS = 200_000;

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function refresh(courseId: string, lessonId: string): void {
  revalidatePath(`/admin/courses/${courseId}/lessons/${lessonId}`);
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath(`/learn/${courseId}/${lessonId}`);
}

async function lessonBelongsToCourse(lessonId: string, courseId: string): Promise<boolean> {
  const { data } = await createServiceClient()
    .from("lessons")
    .select("id")
    .eq("id", lessonId)
    .eq("course_id", courseId)
    .maybeSingle();
  return Boolean(data);
}

// ── Body ────────────────────────────────────────────────────

const SaveBody = Ids.extend({ html: z.string().max(MAX_BODY_CHARS, "The lesson text is too long.") });

export async function saveLessonBody(input: z.input<typeof SaveBody>): Promise<ActionResult> {
  await requireStaff("content");
  const parsed = SaveBody.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { courseId, lessonId, html } = parsed.data;

  const { error } = await createServiceClient()
    .from("lessons")
    .update({ body_html: sanitizeLessonHtml(html) || null })
    .eq("id", lessonId)
    .eq("course_id", courseId);
  if (error) {
    console.error("saveLessonBody failed", { lessonId, error: error.message });
    return fail("Could not save the lesson text.");
  }
  refresh(courseId, lessonId);
  return { ok: true, data: undefined };
}

// ── Video ───────────────────────────────────────────────────

export interface LessonVideoSummary {
  provider: "vimeo" | "mux";
  sourceUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
}

const SetVideo = Ids.extend({ url: z.string().trim().max(500) });

export async function setLessonVideo(input: z.input<typeof SetVideo>): Promise<ActionResult<LessonVideoSummary>> {
  await requireStaff("content");
  const parsed = SetVideo.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { courseId, lessonId, url } = parsed.data;

  const ref = parseVimeoUrl(url);
  if (!ref) return fail("That doesn't look like a Vimeo link. Paste the link from Vimeo's Share or address bar.");
  if (!(await lessonBelongsToCourse(lessonId, courseId))) return fail("Lesson not found.");

  const meta = await fetchVimeoMeta(ref);
  const sb = createServiceClient();
  const { error } = await sb.from("lesson_videos").upsert({
    lesson_id: lessonId,
    provider: "vimeo",
    external_id: ref.id,
    external_hash: ref.hash,
    source_url: url,
    duration_seconds: meta?.durationSeconds ?? null,
    thumbnail_url: meta?.thumbnailUrl ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("setLessonVideo failed", { lessonId, error: error.message });
    return fail("Could not save the video.");
  }

  // Keep the public lesson row in sync for outlines/cards (duration, thumbnail are not secret).
  const { error: lessonError } = await sb
    .from("lessons")
    .update({ duration_seconds: meta?.durationSeconds ?? null, thumbnail_url: meta?.thumbnailUrl ?? null })
    .eq("id", lessonId);
  if (lessonError) console.error("lesson video metadata sync failed", { lessonId, error: lessonError.message });

  refresh(courseId, lessonId);
  return {
    ok: true,
    data: {
      provider: "vimeo",
      sourceUrl: url,
      thumbnailUrl: meta?.thumbnailUrl ?? null,
      durationSeconds: meta?.durationSeconds ?? null,
    },
  };
}

export async function removeLessonVideo(input: z.input<typeof Ids>): Promise<ActionResult> {
  await requireStaff("content");
  const parsed = Ids.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { courseId, lessonId } = parsed.data;
  if (!(await lessonBelongsToCourse(lessonId, courseId))) return fail("Lesson not found.");

  const { error } = await createServiceClient().from("lesson_videos").delete().eq("lesson_id", lessonId);
  if (error) {
    console.error("removeLessonVideo failed", { lessonId, error: error.message });
    return fail("Could not remove the video.");
  }
  refresh(courseId, lessonId);
  return { ok: true, data: undefined };
}

// ── Files ───────────────────────────────────────────────────

const StartUpload = Ids.extend({
  fileName: z.string().min(1).max(255),
  size: z.number().int().nonnegative(),
  contentType: z.string().max(255),
});

/** Step 1: validate and get a one-time signed upload URL (the browser uploads directly to storage). */
export async function startLessonFileUpload(
  input: z.input<typeof StartUpload>
): Promise<ActionResult<{ path: string; token: string }>> {
  await requireStaff("content");
  const parsed = StartUpload.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { courseId, lessonId, fileName, size, contentType } = parsed.data;

  const invalid = validateLessonFile({ name: fileName, size, type: contentType });
  if (invalid) return fail(invalid);
  if (!(await lessonBelongsToCourse(lessonId, courseId))) return fail("Lesson not found.");

  const path = lessonFilePath(lessonId, fileName, randomUUID().slice(0, 8));
  const { data, error } = await createServiceClient().storage.from(LESSON_FILES_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("createSignedUploadUrl failed", { lessonId, error: error?.message });
    return fail("Could not start the upload.");
  }
  return { ok: true, data: { path: data.path, token: data.token } };
}

const FinishUpload = StartUpload.extend({ path: z.string().min(1).max(400) });

/** Step 2: after the browser upload succeeds, record the file on the lesson. */
export async function finishLessonFileUpload(input: z.input<typeof FinishUpload>): Promise<ActionResult> {
  await requireStaff("content");
  const parsed = FinishUpload.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { courseId, lessonId, fileName, size, contentType, path } = parsed.data;
  if (!path.startsWith(`${lessonId}/`)) return fail("Invalid upload.");

  const sb = createServiceClient();
  const { data: last } = await sb
    .from("lesson_files")
    .select("position")
    .eq("lesson_id", lessonId)
    .order("position", { ascending: false })
    .limit(1);
  const { error } = await sb.from("lesson_files").insert({
    lesson_id: lessonId,
    file_name: fileName.slice(0, 255),
    storage_path: path,
    size_bytes: size,
    content_type: contentType || null,
    position: (last?.[0]?.position ?? 0) + 1,
  });
  if (error) {
    console.error("finishLessonFileUpload failed", { lessonId, error: error.message });
    return fail("The file uploaded but could not be attached. Please try again.");
  }
  refresh(courseId, lessonId);
  return { ok: true, data: undefined };
}

const DeleteFile = Ids.extend({ fileId: z.string().uuid() });

export async function deleteLessonFile(input: z.input<typeof DeleteFile>): Promise<ActionResult> {
  await requireStaff("content");
  const parsed = DeleteFile.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { courseId, lessonId, fileId } = parsed.data;

  const sb = createServiceClient();
  const { data: file } = await sb
    .from("lesson_files")
    .select("storage_path")
    .eq("id", fileId)
    .eq("lesson_id", lessonId)
    .maybeSingle();
  if (!file) return fail("File not found.");

  const { error: storageError } = await sb.storage.from(LESSON_FILES_BUCKET).remove([file.storage_path]);
  if (storageError) console.error("lesson file storage delete failed", { fileId, error: storageError.message });

  const { error } = await sb.from("lesson_files").delete().eq("id", fileId);
  if (error) {
    console.error("deleteLessonFile failed", { fileId, error: error.message });
    return fail("Could not delete the file.");
  }
  refresh(courseId, lessonId);
  return { ok: true, data: undefined };
}
