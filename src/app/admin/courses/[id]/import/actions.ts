"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { parseOutlineImport, type ImportError } from "@/lib/outline-import";
import { parseVimeoUrl } from "@/lib/video/vimeo";
import { fetchVimeoMeta } from "@/lib/video/vimeo-oembed";

export type ImportActionResult =
  | { ok: true; data: { modulesCreated: number; lessonsCreated: number; skipped: ImportError[] } }
  | { ok: false; error: string };

type ServiceClient = ReturnType<typeof createServiceClient>;
const META_CONCURRENCY = 4;

const Input = z.object({ courseId: z.string().min(1).max(100), text: z.string().max(500_000) });

/** Find a module by title under a parent (case-insensitive) or create it as a draft. */
async function ensureModule(
  sb: ServiceClient,
  cache: Map<string, string>,
  courseId: string,
  parentId: string | null,
  title: string
): Promise<{ id: string; created: boolean }> {
  const key = `${parentId ?? "root"}::${title.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) return { id: cached, created: false };

  let query = sb.from("modules").select("id, title, position").eq("course_id", courseId);
  query = parentId ? query.eq("parent_id", parentId) : query.is("parent_id", null);
  const { data: siblings } = await query;
  const existing = (siblings ?? []).find((m) => m.title.toLowerCase() === title.toLowerCase());
  if (existing) {
    cache.set(key, existing.id);
    return { id: existing.id, created: false };
  }

  const position = Math.max(0, ...(siblings ?? []).map((m) => m.position)) + 1;
  const { data, error } = await sb
    .from("modules")
    .insert({ course_id: courseId, parent_id: parentId, title, position, published: false })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Could not create module "${title}": ${error?.message ?? "unknown"}`);
  cache.set(key, data.id);
  return { id: data.id, created: true };
}

/** Best-effort thumbnails/durations, a few at a time so a big import stays quick. */
async function fillVideoMetadata(sb: ServiceClient, items: { lessonId: string; url: string }[]): Promise<void> {
  for (let i = 0; i < items.length; i += META_CONCURRENCY) {
    await Promise.all(
      items.slice(i, i + META_CONCURRENCY).map(async ({ lessonId, url }) => {
        const ref = parseVimeoUrl(url);
        const meta = ref ? await fetchVimeoMeta(ref) : null;
        if (!meta) return;
        await sb.from("lesson_videos").update({ duration_seconds: meta.durationSeconds, thumbnail_url: meta.thumbnailUrl }).eq("lesson_id", lessonId);
        await sb.from("lessons").update({ duration_seconds: meta.durationSeconds, thumbnail_url: meta.thumbnailUrl }).eq("id", lessonId);
      })
    );
  }
}

/** Creates draft modules/submodules/lessons (and Vimeo links) from a pasted table. */
export async function importOutline(input: z.input<typeof Input>): Promise<ImportActionResult> {
  await requireStaff("content");
  const parsed = Input.safeParse(input);
  if (!parsed.success) return { ok: false, error: "The pasted text is too large." };
  const { courseId, text } = parsed.data;

  const { rows, errors } = parseOutlineImport(text);
  if (rows.length === 0) return { ok: false, error: errors[0]?.message ?? "Nothing to import." };

  const sb = createServiceClient();
  const { data: course } = await sb.from("courses").select("id").eq("id", courseId).maybeSingle();
  if (!course) return { ok: false, error: "Course not found." };

  const moduleCache = new Map<string, string>();
  const nextLessonPosition = new Map<string, number>();
  // Lesson titles already in each module, so pasting the same table twice adds nothing.
  const titlesIn = new Map<string, Set<string>>();
  const skipped: ImportError[] = [...errors];
  const videos: { lessonId: string; url: string }[] = [];
  let modulesCreated = 0;
  let lessonsCreated = 0;

  try {
    for (const row of rows) {
      const top = await ensureModule(sb, moduleCache, courseId, null, row.module);
      const target = row.submodule ? await ensureModule(sb, moduleCache, courseId, top.id, row.submodule) : top;
      modulesCreated += Number(top.created) + Number(row.submodule ? target.created : false);

      if (!titlesIn.has(target.id)) {
        const { data: existing } = await sb.from("lessons").select("title, position").eq("module_id", target.id);
        titlesIn.set(target.id, new Set((existing ?? []).map((l) => l.title.toLowerCase())));
        nextLessonPosition.set(target.id, Math.max(0, ...(existing ?? []).map((l) => l.position)) + 1);
      }
      const titles = titlesIn.get(target.id) ?? new Set<string>();
      if (titles.has(row.lesson.toLowerCase())) {
        skipped.push({ line: row.line, message: `"${row.lesson}" is already in this module` });
        continue;
      }
      titlesIn.set(target.id, new Set([...titles, row.lesson.toLowerCase()]));
      const position = nextLessonPosition.get(target.id) ?? 1;
      nextLessonPosition.set(target.id, position + 1);

      const { data: lesson, error } = await sb
        .from("lessons")
        .insert({ course_id: courseId, module_id: target.id, title: row.lesson, description: row.description, kind: "video", published: false, position })
        .select("id")
        .single();
      if (error || !lesson) throw new Error(`Line ${row.line}: could not create "${row.lesson}" (${error?.message ?? "unknown"})`);
      lessonsCreated++;

      const ref = row.vimeoUrl ? parseVimeoUrl(row.vimeoUrl) : null;
      if (ref && row.vimeoUrl) {
        const { error: videoError } = await sb.from("lesson_videos").insert({
          lesson_id: lesson.id,
          provider: "vimeo",
          external_id: ref.id,
          external_hash: ref.hash,
          source_url: row.vimeoUrl,
        });
        if (videoError) console.error("import video insert failed", { line: row.line, error: videoError.message });
        else videos.push({ lessonId: lesson.id, url: row.vimeoUrl });
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Import failed.";
    console.error("importOutline failed", { courseId, message, lessonsCreated });
    revalidatePath(`/admin/courses/${courseId}`);
    return { ok: false, error: `${message}. ${lessonsCreated} lesson(s) were imported before the error.` };
  }

  await fillVideoMetadata(sb, videos);
  revalidatePath(`/admin/courses/${courseId}`);
  return { ok: true, data: { modulesCreated, lessonsCreated, skipped: [...skipped].sort((a, b) => a.line - b.line) } };
}
