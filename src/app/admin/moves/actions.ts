"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { publicBucketBase } from "@/lib/supabase/public-url";
import { COURSE_IMAGES_BUCKET, validateCourseImage } from "@/lib/lesson-files";
import { MOVE_STEPS } from "@/lib/content/limits";
import { parseTextList } from "@/lib/content/lists";
import { moveImagePath, moveImagePathFromUrl } from "@/lib/content/moves";
import { MOVE_SLUG_PATTERN } from "@/lib/content/slug";

/** Admin → Moves Library: create / edit / delete moves and upload their images. */
export type MoveActionResult = { error: string } | undefined;
type ServiceClient = ReturnType<typeof createServiceClient>;

const blankToNull = (v: unknown) => (v === "" || v == null ? null : v);
/** Missing fields count as blank, so a field left off the page never fails the save. */
const text = z.preprocess((v) => (typeof v === "string" ? v : ""), z.string().trim());
const optionalText = (max: number, label: string) => text.pipe(z.string().max(max, `${label} can be up to ${max} characters.`)).transform((v) => v || null);
const checkbox = z.preprocess((v) => v === "on", z.boolean());

const MoveSchema = z.object({
  id: z.preprocess(blankToNull, z.string().uuid().nullable()),
  name: z.string().trim().min(1, "Give the move a name.").max(80, "Keep the name under 80 characters."),
  slug: z.string().trim().toLowerCase().regex(MOVE_SLUG_PATTERN, "URL name: 2–60 lowercase letters, numbers or dashes."),
  course_id: z.preprocess(blankToNull, z.string().max(100).nullable()),
  lesson_id: z.preprocess(blankToNull, z.string().uuid("Choose a lesson from the list.").nullable()),
  cue: optionalText(120, "The cue"),
  summary: optionalText(600, "The summary"),
  video_url: text
    .pipe(z.string().max(500))
    .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "The clip link must start with https://")
    .transform((v) => v || null),
  image_url: text.pipe(z.string().max(500)),
  loads_joints: checkbox,
  gentle_alternative: optionalText(600, "The gentle alternative"),
  position: z.coerce.number({ message: "Position must be a number." }).int().min(0, "Position: 0–1000.").max(1000, "Position: 0–1000."),
  published: checkbox,
});

const imagesBase = (sb: ServiceClient) => publicBucketBase(sb, COURSE_IMAGES_BUCKET);

/** The course/lesson pair must be real and consistent; a lesson alone implies its course. */
async function resolvePlacement(sb: ServiceClient, courseId: string | null, lessonId: string | null): Promise<{ course_id: string | null; lesson_id: string | null } | { error: string }> {
  if (lessonId) {
    const { data: lesson } = await sb.from("lessons").select("course_id").eq("id", lessonId).maybeSingle();
    if (!lesson) return { error: "Choose a lesson from the list." };
    if (courseId && lesson.course_id !== courseId) return { error: "That lesson isn't in the chosen course." };
    return { course_id: lesson.course_id as string, lesson_id: lessonId };
  }
  if (courseId) {
    const { data: course } = await sb.from("courses").select("id").eq("id", courseId).maybeSingle();
    if (!course) return { error: "Choose a course from the list." };
  }
  return { course_id: courseId, lesson_id: null };
}

async function removeStoredImage(sb: ServiceClient, url: string | null, moveId: string): Promise<void> {
  const path = url ? moveImagePathFromUrl(url, imagesBase(sb)) : null;
  if (!path) return;
  const { error } = await sb.storage.from(COURSE_IMAGES_BUCKET).remove([path]);
  if (error) console.error("[admin/moves] image cleanup failed", { moveId, error: error.message });
}

function revalidateMoves(id?: string): void {
  revalidatePath("/admin/moves");
  if (id) revalidatePath(`/admin/moves/${id}`);
  revalidatePath("/moves");
}

export async function saveMove(formData: FormData): Promise<MoveActionResult> {
  await requireStaff("content");
  const parsed = MoveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const steps = parseTextList(formData.getAll("steps"), MOVE_STEPS);
  if (!steps.ok) return { error: steps.error };

  const sb = createServiceClient();
  const { id, image_url: imageUrl, course_id: courseId, lesson_id: lessonId, ...fields } = parsed.data;
  if (imageUrl && !moveImagePathFromUrl(imageUrl, imagesBase(sb))) return { error: "Upload the image again." };
  const placement = await resolvePlacement(sb, courseId, lessonId);
  if ("error" in placement) return placement;

  const row = { ...fields, ...placement, steps: steps.value, image_url: imageUrl || null };
  const previous = id ? await sb.from("moves").select("image_url").eq("id", id).maybeSingle() : null;
  if (id && !previous?.data) return { error: "This move no longer exists." };

  const result = id ? await sb.from("moves").update(row).eq("id", id).select("id").single() : await sb.from("moves").insert(row).select("id").single();
  if (result.error || !result.data) {
    if (result.error?.code === "23505") return { error: "Another move already uses that URL name." };
    console.error("[admin/moves] save failed", { id, error: result.error?.message });
    return { error: "Could not save the move." };
  }
  const savedId = result.data.id as string;
  const oldImage = (previous?.data?.image_url as string | null) ?? null;
  if (oldImage && oldImage !== row.image_url) await removeStoredImage(sb, oldImage, savedId);

  revalidateMoves(savedId);
  redirect(`/admin/moves/${savedId}?saved=1`);
}

export async function deleteMove(formData: FormData): Promise<void> {
  await requireStaff("content");
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) redirect("/admin/moves?error=" + encodeURIComponent("Invalid move."));
  const sb = createServiceClient();
  const { data: move } = await sb.from("moves").select("image_url").eq("id", id.data).maybeSingle();
  const { error } = await sb.from("moves").delete().eq("id", id.data);
  if (error) {
    console.error("[admin/moves] delete failed", { id: id.data, error: error.message });
    redirect(`/admin/moves/${id.data}?error=` + encodeURIComponent("Could not delete the move."));
  }
  await removeStoredImage(sb, (move?.image_url as string | null) ?? null, id.data);
  revalidateMoves();
  redirect("/admin/moves?deleted=1");
}

const StartUpload = z.object({
  fileName: z.string().min(1).max(255),
  size: z.number().int().nonnegative(),
  contentType: z.string().max(100),
});

export type StartUploadResult = { ok: true; path: string; token: string; publicUrl: string } | { ok: false; error: string };

/** A one-time signed upload URL for a move image (public course-images bucket, moves/ folder). */
export async function startMoveImageUpload(input: z.input<typeof StartUpload>): Promise<StartUploadResult> {
  await requireStaff("content");
  const parsed = StartUpload.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid upload." };
  const { fileName, size, contentType } = parsed.data;
  const invalid = validateCourseImage({ name: fileName, size, type: contentType });
  if (invalid) return { ok: false, error: invalid };

  const sb = createServiceClient();
  const path = moveImagePath(fileName, randomUUID());
  const { data, error } = await sb.storage.from(COURSE_IMAGES_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[admin/moves] upload url failed", { error: error?.message });
    return { ok: false, error: "Could not start the upload." };
  }
  const publicUrl = sb.storage.from(COURSE_IMAGES_BUCKET).getPublicUrl(data.path).data.publicUrl;
  return { ok: true, path: data.path, token: data.token, publicUrl };
}
