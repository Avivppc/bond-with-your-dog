import "server-only";
import type { createServiceClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/pricing";
import { isEnrollmentActive } from "@/lib/enrollment";
import { chunkDocs } from "./knowledge";
import { buildMemberDocs, buildSalesDocs, lessonDoc, type CourseRow, type LessonRow, type ModuleRow, type OfferInfo } from "./corpus";
import type { KnowledgeChunk, KnowledgeDoc } from "./types";

/**
 * Loads what the assistant may know (service role, so every rule is applied here):
 *  - members: full content of lessons in chapters they have FULL, unexpired access to (drip
 *    respected), plus free previews; only published lessons in live modules.
 *  - visitors: public chapter overviews, lesson TITLES and published one-time offer prices.
 * Corpora are cached in memory for a few minutes per server instance.
 */

type ServiceClient = ReturnType<typeof createServiceClient>;

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHED_MEMBERS = 200;

const COURSE_FIELDS = "id, title, description, chapter_number, requires_course_id, what_you_need, before_you_start";
const LESSON_META_FIELDS = "id, course_id, module_id, position, title, kind, description, free_preview, published, available_after_days";
const LESSON_FULL_FIELDS = `${LESSON_META_FIELDS}, key_takeaways, cues, practice_steps, practice_minutes, body_html`;

interface CacheEntry {
  at: number;
  chunks: KnowledgeChunk[];
}

let salesCache: CacheEntry | null = null;
const memberCache = new Map<string, CacheEntry>();

function fresh(entry: CacheEntry | null | undefined, now: number): entry is CacheEntry {
  return Boolean(entry) && now - (entry as CacheEntry).at < CACHE_TTL_MS;
}

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`[assistant] ${what} load failed: ${res.error.message}`);
  return res.data as T;
}

async function loadCourses(sb: ServiceClient): Promise<Map<string, CourseRow>> {
  const rows = must(await sb.from("courses").select(COURSE_FIELDS).eq("published", true), "courses") as CourseRow[];
  return new Map(rows.map((c) => [c.id, c]));
}

async function loadModules(sb: ServiceClient, courseIds: readonly string[]): Promise<Map<string, ModuleRow>> {
  if (courseIds.length === 0) return new Map();
  const rows = must(await sb.from("modules").select("id, parent_id, published").in("course_id", [...courseIds]), "modules") as ModuleRow[];
  return new Map(rows.map((m) => [m.id, m]));
}

async function loadOffers(sb: ServiceClient): Promise<OfferInfo[]> {
  const rows = must(
    await sb
      .from("offer_courses")
      .select("course_id, offers!inner(id, title, price_cents, currency, days_of_access, status, payment_type)")
      .eq("access_level", "full")
      .eq("offers.status", "published")
      .eq("offers.payment_type", "one_time"),
    "offers",
  ) as { course_id: string; offers: unknown }[];
  type OfferRow = { id: string; title: string; price_cents: number; currency: string; days_of_access: number | null };
  const grouped = rows.reduce((acc, r) => {
    const offer = r.offers as OfferRow;
    const prev = acc.get(offer.id);
    return acc.set(offer.id, { offer, courseIds: [...(prev?.courseIds ?? []), r.course_id] });
  }, new Map<string, { offer: OfferRow; courseIds: string[] }>());
  return [...grouped.values()]
    .sort((a, b) => a.offer.price_cents - b.offer.price_cents)
    .map(({ offer, courseIds }) => ({
      title: offer.title,
      priceLabel: formatMoney(offer.price_cents, offer.currency),
      daysOfAccess: offer.days_of_access,
      courseIds,
    }));
}

async function salesDocs(sb: ServiceClient): Promise<KnowledgeDoc[]> {
  const courses = await loadCourses(sb);
  const courseIds = [...courses.keys()];
  const [lessonRes, modules, offers] = await Promise.all([
    courseIds.length ? sb.from("lessons").select(LESSON_META_FIELDS).eq("published", true).in("course_id", courseIds) : Promise.resolve({ data: [], error: null }),
    loadModules(sb, courseIds),
    loadOffers(sb),
  ]);
  return buildSalesDocs({ courses, lessons: must(lessonRes, "lessons") as LessonRow[], modules, offers });
}

export async function loadSalesChunks(sb: ServiceClient, now: number = Date.now()): Promise<KnowledgeChunk[]> {
  if (fresh(salesCache, now)) return salesCache.chunks;
  const chunks = chunkDocs(await salesDocs(sb));
  salesCache = { at: now, chunks };
  return chunks;
}

/** Chapters the member has full, unexpired access to, with when they enrolled (for drip). */
async function fullAccess(sb: ServiceClient, userId: string, now: Date): Promise<Map<string, string>> {
  const rows = must(
    await sb.from("enrollments").select("course_id, enrolled_at, expires_at").eq("user_id", userId).eq("access_level", "full"),
    "enrollments",
  ) as { course_id: string; enrolled_at: string; expires_at: string | null }[];
  return new Map(rows.filter((e) => isEnrollmentActive(e, now)).map((e) => [e.course_id, e.enrolled_at]));
}

async function memberDocs(sb: ServiceClient, userId: string, now: Date): Promise<KnowledgeDoc[]> {
  const [courses, access] = await Promise.all([loadCourses(sb), fullAccess(sb, userId, now)]);
  const owned = [...access.keys()].filter((id) => courses.has(id));
  const [ownedRes, previewRes] = await Promise.all([
    owned.length ? sb.from("lessons").select(LESSON_FULL_FIELDS).eq("published", true).in("course_id", owned) : Promise.resolve({ data: [], error: null }),
    sb.from("lessons").select(LESSON_FULL_FIELDS).eq("published", true).eq("free_preview", true),
  ]);
  const byId = new Map([...(must(previewRes, "preview lessons") as LessonRow[]), ...(must(ownedRes, "lessons") as LessonRow[])].map((l) => [l.id, l]));
  const lessons = [...byId.values()];
  const modules = await loadModules(sb, [...new Set(lessons.map((l) => l.course_id))]);
  return buildMemberDocs({ courses, access, lessons, modules, now });
}

export async function loadMemberChunks(sb: ServiceClient, userId: string, now: Date = new Date()): Promise<KnowledgeChunk[]> {
  const cached = memberCache.get(userId);
  if (fresh(cached, now.getTime())) return cached.chunks;
  const chunks = chunkDocs(await memberDocs(sb, userId, now));
  if (memberCache.size >= MAX_CACHED_MEMBERS) {
    const oldest = memberCache.keys().next().value;
    if (oldest) memberCache.delete(oldest);
  }
  memberCache.set(userId, { at: now.getTime(), chunks });
  return chunks;
}

export interface CurrentLesson {
  docId: string;
  title: string;
  chunks: KnowledgeChunk[];
}

/** The lesson the member is on (call only after the member's access to it was checked). */
export async function loadCurrentLesson(sb: ServiceClient, lessonId: string): Promise<CurrentLesson | null> {
  const lesson = must(await sb.from("lessons").select(LESSON_FULL_FIELDS).eq("id", lessonId).maybeSingle(), "lesson") as LessonRow | null;
  if (!lesson || lesson.kind === "quiz") return lesson ? { docId: `lesson:${lesson.id}`, title: lesson.title, chunks: [] } : null;
  const course = must(await sb.from("courses").select(COURSE_FIELDS).eq("id", lesson.course_id).maybeSingle(), "course") as CourseRow | null;
  const doc = lessonDoc(lesson, course ?? undefined);
  return { docId: doc.id, title: lesson.title, chunks: chunkDocs([doc]) };
}
