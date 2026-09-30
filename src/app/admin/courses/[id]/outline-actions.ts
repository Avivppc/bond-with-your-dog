"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Course outline editing (modules, submodules, lesson order/visibility).
 * Called from the client editor; every action re-checks the staff role and
 * returns a result object so the UI can show errors instead of crashing.
 */
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const uuid = z.string().uuid();
const courseId = z.string().min(1).max(100);
const title = z.string().trim().min(1, "Title is required").max(200);

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function refresh(course: string): void {
  revalidatePath(`/admin/courses/${course}`);
  revalidatePath(`/learn/${course}`);
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
    return fail(error?.code === "23514" ? "Submodules can only be one level deep." : "Could not create the module.");
  }
  refresh(course);
  return { ok: true, data: { id: data.id } };
}

const UpdateModule = z.object({
  courseId,
  id: uuid,
  title: title.optional(),
  published: z.boolean().optional(),
});

export async function updateModule(input: z.input<typeof UpdateModule>): Promise<ActionResult> {
  await requireStaff("content");
  const parsed = UpdateModule.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { courseId: course, id, ...changes } = parsed.data;

  const { error } = await createServiceClient()
    .from("modules")
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("course_id", course);
  if (error) {
    console.error("updateModule failed", { id, error: error.message });
    return fail("Could not save the module.");
  }
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

  const [{ count: lessonCount }, { count: subCount }, { data: courseRow }] = await Promise.all([
    sb.from("lessons").select("id", { count: "exact", head: true }).eq("module_id", id),
    sb.from("modules").select("id", { count: "exact", head: true }).eq("parent_id", id),
    sb.from("courses").select("paywall_after_module_id").eq("id", course).maybeSingle(),
  ]);
  if ((lessonCount ?? 0) > 0 || (subCount ?? 0) > 0) {
    return fail("Move or delete the lessons and submodules inside this module first.");
  }
  // Deleting it would silently drop the paywall (and open the whole course to limited buyers).
  if (courseRow?.paywall_after_module_id === id) {
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
    return fail("Could not save the new order.");
  }
  refresh(course);
  return { ok: true, data: undefined };
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
    return fail("Could not create the lesson.");
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

  const { error } = await createServiceClient()
    .from("lessons")
    .update({ published })
    .eq("id", id)
    .eq("course_id", course);
  if (error) {
    console.error("setLessonPublished failed", { id, error: error.message });
    return fail("Could not change the lesson status.");
  }
  refresh(course);
  return { ok: true, data: undefined };
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
    return fail("Could not save the new order.");
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

  const { error } = await createServiceClient()
    .from("lessons")
    .update({ module_id: moduleId, position: await nextPosition("lessons", "module_id", moduleId, course) })
    .eq("id", id)
    .eq("course_id", course);
  if (error) {
    console.error("moveLesson failed", { id, moduleId, error: error.message });
    return fail("Could not move the lesson.");
  }
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
    return fail(error.code === "23514" ? "The paywall can only sit between top-level modules." : "Could not move the paywall.");
  }
  refresh(course);
  return { ok: true, data: undefined };
}
