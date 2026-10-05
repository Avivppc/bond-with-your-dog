"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { copyTitle, nextCopyId } from "@/lib/content/outline-ops";
import { copyStoredContent } from "./lessons/lesson-ops";

const CourseId = z.string().regex(/^[a-z0-9][a-z0-9-]{0,79}$/);

function settingsUrl(id: string, params: Record<string, string>): string {
  return `/admin/courses/${id}?${new URLSearchParams({ tab: "settings", ...params }).toString()}`;
}

/**
 * Admin → Course → Settings → "Duplicate course": a draft copy with modules, lessons, videos,
 * quizzes, downloads and thumbnails (no students). The database copies the structure in one go;
 * stored files are then copied lesson by lesson, and any that fail are reported, not fatal.
 */
export async function duplicateCourse(formData: FormData): Promise<void> {
  await requireStaff("content");
  const parsed = CourseId.safeParse(formData.get("id"));
  if (!parsed.success) redirect("/admin/courses");
  const sourceId = parsed.data;

  const sb = createServiceClient();
  const [{ data: course }, { data: similar, error: idsError }] = await Promise.all([
    sb.from("courses").select("title").eq("id", sourceId).maybeSingle(),
    sb.from("courses").select("id").like("id", `${sourceId.slice(0, 70)}-copy%`),
  ]);
  if (idsError) console.error("[course] duplicate id lookup failed", { sourceId, error: idsError.message });
  if (!course) redirect("/admin/courses");

  const newId = nextCopyId(sourceId, new Set((similar ?? []).map((c) => c.id as string)));
  const { data: pairs, error } = await sb.rpc("admin_duplicate_course", {
    p_course_id: sourceId,
    p_new_id: newId,
    p_new_title: copyTitle(String(course.title)),
  });
  if (error) {
    console.error("[course] duplicate failed", { sourceId, newId, error: error.message });
    redirect(settingsUrl(sourceId, { error: "The course couldn't be duplicated. Please try again." }));
  }

  // Downloads and uploaded thumbnails: each copied lesson gets its own stored objects.
  const lessons = (pairs ?? []) as { source_lesson_id: string; copy_lesson_id: string }[];
  const { data: thumbs } = await sb.from("lessons").select("id, thumbnail_upload_url").eq("course_id", sourceId);
  const uploadOf = new Map((thumbs ?? []).map((l) => [l.id as string, (l.thumbnail_upload_url as string | null) ?? null]));
  let failedFiles = 0;
  for (const pair of lessons) {
    const fileError = await copyStoredContent(sb, pair.source_lesson_id, pair.copy_lesson_id, uploadOf.get(pair.source_lesson_id) ?? null);
    if (fileError) {
      failedFiles += 1;
      console.error("[course] duplicate: lesson files not copied", { sourceId, lesson: pair.source_lesson_id, error: fileError });
    }
  }

  revalidatePath("/admin/courses");
  revalidatePath("/admin/products");
  const saved: Record<string, string> =
    failedFiles > 0
      ? { error: `Course duplicated as a draft, but the files of ${failedFiles} lesson${failedFiles === 1 ? "" : "s"} couldn't be copied. Add them again in those lessons.` }
      : { saved: "duplicated" };
  redirect(`/admin/courses/${newId}?${new URLSearchParams(saved).toString()}`);
}
