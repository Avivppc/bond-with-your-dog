"use server";

import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { MAX_MODULE_DESCRIPTION } from "@/lib/content/limits";
import { moduleScope } from "@/lib/content/outline-ops";
import { revalidateCourseContent } from "@/app/admin/courses/revalidate";
import { deleteLessonCompletely, duplicateLessonCompletely } from "./lessons/lesson-ops";

/**
 * Course outline editing (modules, submodules, lesson order/visibility).
 * Called from the client editor; every action re-checks the staff role and
 * returns a result object so the UI can show errors instead of crashing.
 */
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const uuid = z.string().uuid();
const courseId = z.string().min(1).max(100);
const title = z.string().trim().min(1, "Title is required").max(200, "Titles can be up to 200 characters");

/** Postgres check_violation: our structure triggers (module depth, lesson ↔ module course). */
const STRUCTURE_VIOLATION = "23514";

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function refresh(course: string): void {
  revalidateCourseContent(course);
}

async function nextPosition(
  table: "modules" | "lessons",
  column: "parent_id" | "module_id",
  value: string | null,
  course: string
): Promise<number> {
  const sb = createServiceClient();
  let query = sb.from(table).select("position").eq("course_id", course);
  query = value === null ? query.is(column, null) : query.eq(column, value);
  const { data } = await query.order("position", { ascending: false }).limit(1);
  return (data?.[0]?.position ?? 0) + 1;
}

// ── Modules ─────────────────────────────────────────────────

const CreateModule = z.object({ courseId, parentId: uuid.nullable(), title });

export async function createModule(input: z.input<typeof CreateModule>): Promise<ActionResult<{ id: string }>> {
  await requireStaff("content");
  const parsed = CreateModule.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { courseId: course, parentId, title: name } = parsed.data;

  const { data, error } = await createServiceClient()
    .from("modules")
    .insert({
      course_id: course,
      parent_id: parentId,
      title: name,
      position: await nextPosition("modules", "parent_id", parentId, course),
      published: false,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("createModule failed", { course, error: error?.message });
    return fail(error?.code === STRUCTURE_VIOLATION ? "Submodules can only be one level deep." : "Could not create the module.");
  }
  refresh(course);
  return { ok: true, data: { id: data.id } };
}

const UpdateModule = z.object({
  courseId,
  id: uuid,
  title: title.optional(),
  description: z
    .string()
    .trim()
    .max(MAX_MODULE_DESCRIPTION, `The description can be up to ${MAX_MODULE_DESCRIPTION} characters`)
    .transform((v) => v || null)
    .optional(),
  published: z.boolean().optional(),
});

export async function updateModule(input: z.input<typeof UpdateModule>): Promise<ActionResult> {
  await requireStaff("content");
  const parsed = UpdateModule.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { courseId: course, id, ...changes } = parsed.data;

  const { data, error } = await createServiceClient()
    .from("modules")
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("course_id", course)
    .select("id");
  if (error) {
    console.error("updateModule failed", { id, error: error.message });
    return fail("Could not save the module.");
  }
  if (!data?.length) return fail("This module no longer exists. Reload the page.");
  refresh(course);
  return { ok: true, data: undefined };
}

const DeleteModule = z.object({ courseId, id: uuid });

export async function deleteModule(input: z.input<typeof DeleteModule>): Promise<ActionResult> {
  await requireStaff("content");
  const parsed = DeleteModule.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { courseId: course, id } = parsed.data;
  const sb = createServiceClient();

  const [lessonsRes, subsRes, courseRes] = await Promise.all([
    sb.from("lessons").select("id", { count: "exact", head: true }).eq("module_id", id),
    sb.from("modules").select("id", { count: "exact", head: true }).eq("parent_id", id),
    sb.from("courses").select("paywall_after_module_id").eq("id", course).maybeSingle(),
  ]);
  const checkError = lessonsRes.error ?? subsRes.error ?? courseRes.error;
  if (checkError) {
    console.error("deleteModule check failed", { id, error: checkError.message });
    return fail("Could not delete the module.");
  }
  if ((lessonsRes.count ?? 0) > 0 || (subsRes.count ?? 0) > 0) {
    return fail("Move or delete the lessons and submodules inside this module first.");
  }
  // Deleting it would silently drop the paywall (and open the whole course to limited buyers).
  if (courseRes.data?.paywall_after_module_id === id) {
    return fail("The paywall sits right after this module. Drag the paywall somewhere else first.");
  }

  const { error } = await sb.from("modules").delete().eq("id", id).eq("course_id", course);
  if (error) {
    console.error("deleteModule failed", { id, error: error.message });
    return fail("Could not delete the module.");
  }
  refresh(course);
  return { ok: true, data: undefined };
}

const ReorderModules = z.object({ courseId, parentId: uuid.nullable(), ids: z.array(uuid).max(500) });

export async function reorderModules(input: z.input<typeof ReorderModules>): Promise<ActionResult> {
  await requireStaff("content");
  const parsed = ReorderModules.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { courseId: course, parentId, ids } = parsed.data;

  const { error } = await createServiceClient().rpc("reorder_modules", {
    p_course_id: course,
    p_parent_id: parentId,
    p_module_ids: ids,
  });
  if (error) {
    console.error("reorderModules failed", { course, error: error.message });
    return fail("Could not save the new order. Reload the page and try again.");
  }
  refresh(course);
  return { ok: true, data: undefined };
}

// ── Bulk status ─────────────────────────────────────────────

const SetOutlinePublished = z.object({ courseId, moduleId: uuid.nullable(), published: z.boolean() });

/**
 * Kajabi bulk publish / unpublish: a module (with its submodules and every lesson in them),
 * or — with moduleId null — the whole course outline. Handy after an import, which creates drafts.
 */
export async function setOutlinePublished(input: z.input<typeof SetOutlinePublished>): Promise<ActionResult<{ lessons: number }>> {
  await requireStaff("content");
  const parsed = SetOutlinePublished.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { courseId: course, moduleId, published } = parsed.data;
  const sb = createServiceClient();

  const { data: modules, error: loadError } = await sb.from("modules").select("id, parent_id").eq("course_id", course);
  if (loadError) {
    console.error("setOutlinePublished load failed", { course, error: loadError.message });
    return fail("Could not change the status.");
  }
  const scope = moduleScope(modules ?? [], moduleId);
  if (moduleId && scope.length === 0) return fail("This module no longer exists. Reload the page.");

  const now = new Date().toISOString();
  const [modulesRes, lessonsRes] = await Promise.all([
    scope.length ? sb.from("modules").update({ published, updated_at: now }).eq("course_id", course).in("id", scope) : Promise.resolve({ error: null }),
    (moduleId
      ? sb.from("lessons").update({ published }).eq("course_id", course).in("module_id", scope)
      : sb.from("lessons").update({ published }).eq("course_id", course)
    ).select("id"),
  ]);
  const error = modulesRes.error ?? lessonsRes.error;
  if (error) {
    console.error("setOutlinePublished failed", { course, moduleId, error: error.message });
    return fail("Could not change the status of every item. Reload the page to see what changed.");
  }
  refresh(course);
  return { ok: true, data: { lessons: lessonsRes.data?.length ?? 0 } };
}

// ── Lessons ─────────────────────────────────────────────────

const CreateLesson = z.object({ courseId, moduleId: uuid, title });

export async function createLessonInModule(
  input: z.input<typeof CreateLesson>
): Promise<ActionResult<{ id: string }>> {
  await requireStaff("content");
  const parsed = CreateLesson.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { courseId: course, moduleId, title: name } = parsed.data;

  const { data, error } = await createServiceClient()
    .from("lessons")
    .insert({
      course_id: course,
      module_id: moduleId,
      title: name,
      kind: "video",
      published: false,
      position: await nextPosition("lessons", "module_id", moduleId, course),
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("createLessonInModule failed", { course, moduleId, error: error?.message });
    return fail(error?.code === STRUCTURE_VIOLATION ? "That module isn't part of this course. Reload the page." : "Could not create the lesson.");
  }
  refresh(course);
  return { ok: true, data: { id: data.id } };
}

const SetLessonPublished = z.object({ courseId, id: uuid, published: z.boolean() });

export async function setLessonPublished(input: z.input<typeof SetLessonPublished>): Promise<ActionResult> {
  await requireStaff("content");
  const parsed = SetLessonPublished.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { courseId: course, id, published } = parsed.data;

  const { data, error } = await createServiceClient()
    .from("lessons")
    .update({ published })
    .eq("id", id)
    .eq("course_id", course)
    .select("id");
  if (error) {
    console.error("setLessonPublished failed", { id, error: error.message });
    return fail("Could not change the lesson status.");
  }
  if (!data?.length) return fail("This lesson no longer exists. Reload the page.");
  refresh(course);
  return { ok: true, data: undefined };
}

const LessonRef = z.object({ courseId, id: uuid });

/** Outline ⋯ → Duplicate: a draft copy (video, quiz, files, thumbnail) right below the original. */
export async function duplicateLessonInOutline(input: z.input<typeof LessonRef>): Promise<ActionResult<{ id: string }>> {
  await requireStaff("content");
  const parsed = LessonRef.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const res = await duplicateLessonCompletely(createServiceClient(), parsed.data.courseId, parsed.data.id);
  if (res.ok) refresh(parsed.data.courseId);
  return res;
}

/** Outline ⋯ → Delete: removes the lesson, its files and students' progress on it. */
export async function deleteLessonInOutline(input: z.input<typeof LessonRef>): Promise<ActionResult> {
  await requireStaff("content");
  const parsed = LessonRef.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const res = await deleteLessonCompletely(createServiceClient(), parsed.data.courseId, parsed.data.id);
  if (res.ok) refresh(parsed.data.courseId);
  return res;
}

const ReorderLessons = z.object({ courseId, moduleId: uuid, ids: z.array(uuid).max(500) });

export async function reorderLessons(input: z.input<typeof ReorderLessons>): Promise<ActionResult> {
  await requireStaff("content");
  const parsed = ReorderLessons.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { courseId: course, moduleId, ids } = parsed.data;

  const { error } = await createServiceClient().rpc("reorder_lessons", {
    p_module_id: moduleId,
    p_lesson_ids: ids,
  });
  if (error) {
    console.error("reorderLessons failed", { moduleId, error: error.message });
    return fail("Could not save the new order. Reload the page and try again.");
  }
  refresh(course);
  return { ok: true, data: undefined };
}

const MoveLesson = z.object({ courseId, id: uuid, moduleId: uuid });

export async function moveLesson(input: z.input<typeof MoveLesson>): Promise<ActionResult> {
  await requireStaff("content");
  const parsed = MoveLesson.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { courseId: course, id, moduleId } = parsed.data;

  const { data, error } = await createServiceClient()
    .from("lessons")
    .update({ module_id: moduleId, position: await nextPosition("lessons", "module_id", moduleId, course) })
    .eq("id", id)
    .eq("course_id", course)
    .select("id");
  if (error) {
    console.error("moveLesson failed", { id, moduleId, error: error.message });
    return fail(error.code === STRUCTURE_VIOLATION ? "That module isn't part of this course. Reload the page." : "Could not move the lesson.");
  }
  if (!data?.length) return fail("This lesson no longer exists. Reload the page.");
  refresh(course);
  return { ok: true, data: undefined };
}

// ── Paywall ─────────────────────────────────────────────────

const SetPaywall = z.object({ courseId, afterModuleId: uuid.nullable() });

/**
 * Places the course paywall after a top-level module (null removes it). Members with a
 * "limited access" offer only open content above it; the DB trigger rejects other modules.
 */
export async function setCoursePaywall(input: z.input<typeof SetPaywall>): Promise<ActionResult> {
  await requireStaff("content");
  const parsed = SetPaywall.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { courseId: course, afterModuleId } = parsed.data;

  const { error } = await createServiceClient().from("courses").update({ paywall_after_module_id: afterModuleId }).eq("id", course);
  if (error) {
    console.error("setCoursePaywall failed", { course, error: error.message });
    return fail(error.code === STRUCTURE_VIOLATION ? "The paywall can only sit between top-level modules." : "Could not move the paywall.");
  }
  refresh(course);
  return { ok: true, data: undefined };
}
