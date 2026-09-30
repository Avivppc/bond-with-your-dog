"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { opensAfterError, type ChapterLink } from "@/lib/content/chapters";
import { parseNeeds } from "@/lib/content/needs";

/** Course → Details: the member app's chapter fields (course overview + My Courses). */
const Chapter = z.object({
  id: z.string().trim().min(1).max(100),
  chapter_number: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number({ message: "Chapter number must be a number." }).int("Chapter number must be a whole number.").min(1, "Chapter number: 1–99.").max(99, "Chapter number: 1–99.").nullable()
  ),
  requires_course_id: z.preprocess((v) => (v === "" || v == null ? null : v), z.string().max(100).nullable()),
  before_you_start: z
    .string()
    .trim()
    .max(600, "“Before you start” can be up to 600 characters.")
    .transform((v) => v || null),
  trailer_url: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "The trailer link must start with https://")
    .transform((v) => v || null),
});

function back(courseId: string, params: Record<string, string>): never {
  redirect(`/admin/courses/${encodeURIComponent(courseId)}?${new URLSearchParams({ tab: "details", ...params }).toString()}`);
}

export async function saveCourseChapter(formData: FormData): Promise<void> {
  await requireStaff("content");
  const rawId = String(formData.get("id") ?? "");
  const parsed = Chapter.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back(rawId, { error: parsed.error.issues[0].message });
  const needs = parseNeeds({ icons: formData.getAll("need_icon"), labels: formData.getAll("need_label") });
  if (!needs.ok) back(rawId, { error: needs.error });

  const { id, ...fields } = parsed.data;
  const sb = createServiceClient();
  const { data: courses, error: loadError } = await sb.from("courses").select("id, requires_course_id");
  if (loadError) {
    console.error("[admin/courses] chapter load failed", { id, error: loadError.message });
    back(id, { error: "Could not save the chapter details." });
  }
  const invalid = opensAfterError(id, fields.requires_course_id, (courses ?? []) as ChapterLink[]);
  if (invalid) back(id, { error: invalid });

  const { error } = await sb
    .from("courses")
    .update({ ...fields, what_you_need: needs.value })
    .eq("id", id);
  if (error) {
    console.error("[admin/courses] chapter save failed", { id, error: error.message });
    back(id, { error: "Could not save the chapter details." });
  }
  revalidatePath(`/admin/courses/${id}`);
  revalidatePath(`/learn/${id}`);
  revalidatePath("/my-courses");
  back(id, { saved: "1" });
}
