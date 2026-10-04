import "server-only";
import { randomUUID } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/admin";
import { COURSE_IMAGES_BUCKET, LESSON_FILES_BUCKET, lessonFilePath } from "@/lib/lesson-files";
import { lessonThumbnailPath, lessonThumbnailPathFromUrl } from "@/lib/content/lesson-thumbnail";
import { copyTitle, orderAfter } from "@/lib/content/outline-ops";

/**
 * Lesson operations shared by the lesson editor (form actions) and the outline (client actions):
 * delete with its stored files, and duplicate with its video, quiz, downloads and thumbnail.
 * Callers have already checked the staff role.
 */
export type OpResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

type ServiceClient = ReturnType<typeof createServiceClient>;

/** Columns a copy inherits. Explicit so ids, import refs and timestamps are never duplicated. */
const COPIED_COLUMNS = [
  "course_id",
  "module_id",
  "title",
  "description",
  "duration_seconds",
  "free_preview",
  "kind",
  "available_after_days",
  "pass_threshold",
  "body_html",
  "thumbnail_url",
  "key_takeaways",
  "cues",
  "practice_steps",
  "practice_minutes",
] as const;

function thumbnailPathOf(sb: ServiceClient, url: string | null, lessonId: string): string | null {
  const base = sb.storage.from(COURSE_IMAGES_BUCKET).getPublicUrl("").data.publicUrl;
  return lessonThumbnailPathFromUrl(url, base, lessonId);
}

/** Deletes a lesson, its downloads and its uploaded thumbnail. Rows (files, video, quiz, progress) cascade. */
export async function deleteLessonCompletely(sb: ServiceClient, courseId: string, lessonId: string): Promise<OpResult> {
  const { data: lesson, error: loadError } = await sb
    .from("lessons")
    .select("id, thumbnail_upload_url")
    .eq("id", lessonId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (loadError) console.error("lesson delete: load failed", { lessonId, error: loadError.message });
  if (!lesson) return { ok: false, error: "Lesson not found." };

  const { data: files } = await sb.from("lesson_files").select("storage_path").eq("lesson_id", lessonId);
  const { error } = await sb.from("lessons").delete().eq("id", lessonId).eq("course_id", courseId);
  if (error) {
    console.error("lesson delete failed", { lessonId, error: error.message });
    return { ok: false, error: "Could not delete the lesson." };
  }

  // Storage last: a failed cleanup only leaves an orphaned object, never a broken lesson.
  const paths = (files ?? []).map((f) => f.storage_path as string);
  if (paths.length > 0) {
    const { error: storageError } = await sb.storage.from(LESSON_FILES_BUCKET).remove(paths);
    if (storageError) console.error("lesson delete: file cleanup failed", { lessonId, error: storageError.message });
  }
  const thumbPath = thumbnailPathOf(sb, lesson.thumbnail_upload_url, lessonId);
  if (thumbPath) {
    const { error: thumbError } = await sb.storage.from(COURSE_IMAGES_BUCKET).remove([thumbPath]);
    if (thumbError) console.error("lesson delete: thumbnail cleanup failed", { lessonId, error: thumbError.message });
  }
  return { ok: true, data: undefined };
}

async function insertCopy(sb: ServiceClient, source: Record<string, unknown>): Promise<string | null> {
  const fields = Object.fromEntries(COPIED_COLUMNS.map((c) => [c, source[c] ?? null]));
  const moduleId = source.module_id as string | null;
  let last = sb.from("lessons").select("position").eq("course_id", source.course_id as string);
  last = moduleId ? last.eq("module_id", moduleId) : last.is("module_id", null);
  const { data: tail } = await last.order("position", { ascending: false }).limit(1);

  const { data, error } = await sb
    .from("lessons")
    .insert({
      ...fields,
      // NOT NULL list columns: never send null.
      key_takeaways: source.key_takeaways ?? [],
      cues: source.cues ?? [],
      practice_steps: source.practice_steps ?? [],
      // The copy gets its own stored thumbnail in copyChildren (never shares the original's object).
      thumbnail_upload_url: null,
      title: copyTitle(String(source.title ?? "Lesson")),
      published: false,
      position: ((tail?.[0]?.position as number | undefined) ?? 0) + 1,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("lesson duplicate: insert failed", { sourceId: source.id, error: error?.message });
    return null;
  }
  return data.id as string;
}

/** Video reference, quiz questions, downloads (storage copies) and the uploaded thumbnail. */
async function copyChildren(sb: ServiceClient, sourceId: string, copyId: string, uploadUrl: string | null): Promise<string | null> {
  const [videoRes, questionsRes] = await Promise.all([
    sb.from("lesson_videos").select("provider, external_id, external_hash, playback_policy, duration_seconds, thumbnail_url, source_url").eq("lesson_id", sourceId).maybeSingle(),
    sb.from("quiz_questions").select("position, prompt, kind, options, correct, explanation").eq("lesson_id", sourceId),
  ]);
  const loadError = videoRes.error ?? questionsRes.error;
  if (loadError) return loadError.message;

  if (videoRes.data) {
    const { error } = await sb.from("lesson_videos").insert({ ...videoRes.data, lesson_id: copyId });
    if (error) return error.message;
  }
  if ((questionsRes.data ?? []).length > 0) {
    const { error } = await sb.from("quiz_questions").insert((questionsRes.data ?? []).map((q) => ({ ...q, lesson_id: copyId })));
    if (error) return error.message;
  }
  return copyStoredContent(sb, sourceId, copyId, uploadUrl);
}

/**
 * The parts of a lesson kept in storage: downloads and the uploaded thumbnail. Each copy gets its
 * own objects, so deleting one lesson never removes the other's files. Returns an error message.
 */
export async function copyStoredContent(sb: ServiceClient, sourceId: string, copyId: string, uploadUrl: string | null): Promise<string | null> {
  const filesRes = await sb.from("lesson_files").select("file_name, storage_path, size_bytes, content_type, position").eq("lesson_id", sourceId);
  if (filesRes.error) return filesRes.error.message;
  for (const file of filesRes.data ?? []) {
    const path = lessonFilePath(copyId, file.file_name as string, randomUUID().slice(0, 8));
    const { error: copyError } = await sb.storage.from(LESSON_FILES_BUCKET).copy(file.storage_path as string, path);
    if (copyError) return copyError.message;
    const { error } = await sb.from("lesson_files").insert({ ...file, storage_path: path, lesson_id: copyId });
    if (error) return error.message;
  }

  const thumbPath = thumbnailPathOf(sb, uploadUrl, sourceId);
  if (!thumbPath && uploadUrl) {
    // Not one of our stored objects (never deleted by us), so the copy can simply share the URL.
    const { error } = await sb.from("lessons").update({ thumbnail_upload_url: uploadUrl }).eq("id", copyId);
    if (error) return error.message;
  }
  if (thumbPath) {
    const target = lessonThumbnailPath(copyId, thumbPath, randomUUID());
    const { error: copyError } = await sb.storage.from(COURSE_IMAGES_BUCKET).copy(thumbPath, target);
    if (copyError) return copyError.message;
    const url = sb.storage.from(COURSE_IMAGES_BUCKET).getPublicUrl(target).data.publicUrl;
    const { error } = await sb.from("lessons").update({ thumbnail_upload_url: url }).eq("id", copyId);
    if (error) return error.message;
  }
  return null;
}

/** Puts the copy right below the original (Kajabi behaviour) instead of at the end of the module. */
async function placeAfterOriginal(sb: ServiceClient, moduleId: string | null, sourceId: string, copyId: string): Promise<void> {
  if (!moduleId) return;
  const { data } = await sb.from("lessons").select("id").eq("module_id", moduleId).order("position");
  const ids = orderAfter((data ?? []).map((l) => l.id as string), sourceId, copyId);
  const { error } = await sb.rpc("reorder_lessons", { p_module_id: moduleId, p_lesson_ids: ids });
  if (error) console.error("lesson duplicate: reorder failed (copy stays at the end)", { copyId, error: error.message });
}

/** Creates a draft copy of a lesson with all its content. */
export async function duplicateLessonCompletely(sb: ServiceClient, courseId: string, lessonId: string): Promise<OpResult<{ id: string }>> {
  const { data: source, error: loadError } = await sb.from("lessons").select("*").eq("id", lessonId).eq("course_id", courseId).maybeSingle();
  if (loadError) console.error("lesson duplicate: load failed", { lessonId, error: loadError.message });
  if (!source) return { ok: false, error: "Lesson not found." };

  const copyId = await insertCopy(sb, source);
  if (!copyId) return { ok: false, error: "Could not duplicate the lesson." };

  const childError = await copyChildren(sb, lessonId, copyId, source.thumbnail_upload_url ?? null);
  if (childError) {
    console.error("lesson duplicate: content copy failed, rolling back", { lessonId, copyId, error: childError });
    await deleteLessonCompletely(sb, courseId, copyId);
    return { ok: false, error: "Could not copy the lesson's video, quiz or files. Nothing was duplicated." };
  }
  await placeAfterOriginal(sb, source.module_id ?? null, lessonId, copyId);
  return { ok: true, data: { id: copyId } };
}
