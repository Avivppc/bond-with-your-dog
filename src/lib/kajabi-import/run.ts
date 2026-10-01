import "server-only";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createServiceClient } from "@/lib/supabase/admin";
import { sanitizeLessonHtml } from "@/lib/sanitize";
import { parseVimeoUrl } from "@/lib/video/vimeo";
import { COURSE_IMAGES_BUCKET, LESSON_FILES_BUCKET, lessonFilePath } from "@/lib/lesson-files";
import type { PlannedCourse, PlannedLesson, PlannedModule } from "./plan";

type Service = ReturnType<typeof createServiceClient>;

export interface ImportResult {
  course: string;
  status: "imported" | "skipped" | "failed";
  message: string;
  modules: number;
  lessons: number;
  images: number;
  files: number;
}

const ALLOWED_IMAGE_HOST = "kajabi-storefronts-production.kajabi-cdn.com";
const IMAGE_TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" };

/** Copies a Kajabi CDN image into our public course-images bucket and returns its public URL. */
async function rehostImage(sb: Service, url: string | null): Promise<string | null> {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== ALLOWED_IMAGE_HOST) return null;
  const file = parsed.pathname.split("/").pop() ?? "";
  const ext = file.split(".").pop()?.toLowerCase() ?? "";
  const contentType = IMAGE_TYPES[ext];
  if (!contentType) return null;
  try {
    const res = await fetch(parsed, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return null;
    const body = await res.arrayBuffer();
    if (body.byteLength > 15 * 1024 * 1024) return null;
    const path = `imported/kajabi/${file.replace(/[^A-Za-z0-9._-]/g, "_")}`;
    const storage = sb.storage.from(COURSE_IMAGES_BUCKET);
    const { error } = await storage.upload(path, body, { contentType, upsert: true });
    if (error) {
      console.error("[kajabi-import] image upload failed", { path, error: error.message });
      return null;
    }
    return storage.getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.error("[kajabi-import] image copy failed", { url, error: e instanceof Error ? e.message : e });
    return null;
  }
}

/** Lesson downloads saved from Kajabi (bundled with the import route, see next.config.ts). */
const KAJABI_FILES_DIR = path.join(process.cwd(), "data", "kajabi", "files");
const SAFE_FILE = /^[A-Za-z0-9._-]+\.pdf$/;

/** Uploads a lesson's Kajabi downloads into the private lesson-files bucket; returns how many made it. */
async function attachFiles(sb: Service, lessonId: string, l: PlannedLesson): Promise<number> {
  let attached = 0;
  for (const [position, f] of l.files.entries()) {
    if (!SAFE_FILE.test(f.file)) {
      console.error("[kajabi-import] unexpected download file name", { lesson: l.title, file: f.file });
      continue;
    }
    try {
      const body = await readFile(path.join(KAJABI_FILES_DIR, f.file));
      const fileName = /\.pdf$/i.test(f.name) ? f.name : `${f.name}.pdf`;
      const storagePath = lessonFilePath(lessonId, f.file, randomUUID());
      const { error: uploadError } = await sb.storage.from(LESSON_FILES_BUCKET).upload(storagePath, body, { contentType: "application/pdf" });
      if (uploadError) throw new Error(uploadError.message);
      const { error } = await sb.from("lesson_files").insert({
        lesson_id: lessonId,
        file_name: fileName,
        storage_path: storagePath,
        size_bytes: body.byteLength,
        content_type: "application/pdf",
        position,
      });
      if (error) throw new Error(error.message);
      attached++;
    } catch (e) {
      console.error("[kajabi-import] download copy failed", { lesson: l.title, file: f.file, error: e instanceof Error ? e.message : e });
    }
  }
  return attached;
}

async function insertLesson(sb: Service, courseId: string, moduleId: string, l: PlannedLesson): Promise<{ image: boolean; files: number }> {
  const { data, error } = await sb
    .from("lessons")
    .insert({
      course_id: courseId,
      module_id: moduleId,
      title: l.title,
      position: l.position,
      kind: "video",
      published: l.published,
      body_html: l.bodyHtml ? sanitizeLessonHtml(l.bodyHtml) : null,
      // Kajabi lesson thumbnails were uploaded images there too: keep them as uploads, so a Vimeo
      // video added later doesn't replace them (the lessons trigger copies this to thumbnail_url).
      thumbnail_upload_url: await rehostImage(sb, l.thumbnailUrl),
      available_after_days: l.availableAfterDays,
      import_ref: l.ref,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`lesson "${l.title}": ${error?.message ?? "not created"}`);
  const ref = l.vimeoUrl ? parseVimeoUrl(l.vimeoUrl) : null;
  if (ref && l.vimeoUrl) {
    const { error: videoError } = await sb.from("lesson_videos").insert({ lesson_id: data.id, provider: "vimeo", external_id: ref.id, external_hash: ref.hash, source_url: l.vimeoUrl });
    if (videoError) console.error("[kajabi-import] video link failed", { lesson: l.title, error: videoError.message });
  }
  return { image: Boolean(l.thumbnailUrl), files: await attachFiles(sb, data.id, l) };
}

type Counts = { modules: number; lessons: number; images: number; files: number };

async function insertModule(sb: Service, courseId: string, m: PlannedModule, parentId: string | null, ids: Map<string, string>, counts: Counts) {
  const { data, error } = await sb
    .from("modules")
    .insert({ course_id: courseId, parent_id: parentId, title: m.title, description: m.description, position: m.position, published: m.published, import_ref: m.ref })
    .select("id")
    .single();
  if (error || !data) throw new Error(`module "${m.title}": ${error?.message ?? "not created"}`);
  ids.set(m.ref, data.id);
  counts.modules++;
  for (const l of m.lessons) {
    const added = await insertLesson(sb, courseId, data.id, l);
    if (added.image) counts.images++;
    counts.files += added.files;
    counts.lessons++;
  }
  for (const child of m.children) await insertModule(sb, courseId, child, data.id, ids, counts);
}

/**
 * Creates one planned course as a DRAFT (the team reviews and publishes it). Existing courses —
 * matched by import reference or id — are left untouched, so running the import twice is safe.
 */
export async function importCourse(plan: PlannedCourse): Promise<ImportResult> {
  const sb = createServiceClient();
  const base = { course: plan.title, modules: 0, lessons: 0, images: 0, files: 0 };
  const { data: existing } = await sb.from("courses").select("id").or(`import_ref.eq.${plan.ref},id.eq.${plan.id}`).limit(1);
  if (existing?.length) return { ...base, status: "skipped", message: "Already in the platform — left as it is." };

  const { error } = await sb.from("courses").insert({
    id: plan.id,
    title: plan.title,
    description: plan.description,
    level: plan.level,
    category: plan.category,
    price: 0,
    published: false,
    chapter_number: plan.chapterNumber,
    image: await rehostImage(sb, plan.imageUrl),
    image_alt: plan.title,
    import_ref: plan.ref,
  });
  if (error) return { ...base, status: "failed", message: `Could not create the course: ${error.message}` };

  const counts: Counts = { modules: 0, lessons: 0, images: plan.imageUrl ? 1 : 0, files: 0 };
  const ids = new Map<string, string>();
  try {
    for (const m of plan.modules) await insertModule(sb, plan.id, m, null, ids, counts);
    const paywall = plan.paywallAfterRef ? ids.get(plan.paywallAfterRef) : null;
    // "Opens after" only when the required chapter exists (chapters import in order).
    const { data: required } = plan.requiresCourseId ? await sb.from("courses").select("id").eq("id", plan.requiresCourseId).maybeSingle() : { data: null };
    await sb.from("courses").update({ paywall_after_module_id: paywall ?? null, requires_course_id: required?.id ?? null }).eq("id", plan.id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    console.error("[kajabi-import] course failed", { course: plan.id, message });
    return { ...base, ...counts, status: "failed", message: `Stopped at ${message}. The partial draft course can be deleted from Courses and imported again.` };
  }
  return { ...base, ...counts, status: "imported", message: "Imported as a draft." };
}
