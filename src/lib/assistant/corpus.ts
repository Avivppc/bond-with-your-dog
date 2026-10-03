import { normalizeSpace, stripHtml } from "./text";
import type { KnowledgeDoc } from "./types";

/** Database rows → knowledge docs (pure; the queries live in knowledge-server.ts). */

export interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  chapter_number: number | null;
  requires_course_id: string | null;
  what_you_need: unknown;
  before_you_start: string | null;
}

export interface LessonRow {
  id: string;
  course_id: string;
  module_id: string | null;
  position: number;
  title: string;
  kind: string | null;
  description: string | null;
  free_preview: boolean;
  published: boolean;
  available_after_days: number | null;
  key_takeaways?: string[] | null;
  cues?: string[] | null;
  practice_steps?: unknown;
  practice_minutes?: number | null;
  body_html?: string | null;
}

export interface ModuleRow {
  id: string;
  parent_id: string | null;
  published: boolean;
}

export interface OfferInfo {
  title: string;
  priceLabel: string;
  daysOfAccess: number | null;
  courseIds: readonly string[];
}

/** Same rule as public.is_module_live: the module and its parent (if any) are published. */
export function isLessonLive(lesson: Pick<LessonRow, "published" | "module_id">, modules: ReadonlyMap<string, ModuleRow>): boolean {
  if (!lesson.published) return false;
  if (!lesson.module_id) return true;
  const mod = modules.get(lesson.module_id);
  if (!mod?.published) return false;
  return mod.parent_id ? Boolean(modules.get(mod.parent_id)?.published) : true;
}

/** Drip: a lesson opens `available_after_days` after the member enrolled. */
export function isDripOpen(lesson: Pick<LessonRow, "available_after_days">, enrolledAt: string, now: Date): boolean {
  const days = lesson.available_after_days ?? 0;
  return new Date(enrolledAt).getTime() + days * 24 * 60 * 60 * 1000 <= now.getTime();
}

export function chapterLabel(course: Pick<CourseRow, "title" | "chapter_number">): string {
  return course.chapter_number ? `Chapter ${course.chapter_number}: ${course.title}` : course.title;
}

function needsText(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const label = item && typeof item === "object" ? (item as Record<string, unknown>).label : null;
    return typeof label === "string" && label.trim() ? [label.trim()] : [];
  });
}

function stepsText(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((step, i) => {
    if (!step || typeof step !== "object") return [];
    const { title, body } = step as Record<string, unknown>;
    if (typeof title !== "string" || !title.trim()) return [];
    return [`${i + 1}. ${title.trim()}${typeof body === "string" && body.trim() ? `: ${body.trim()}` : ""}`];
  });
}

const list = (label: string, items: readonly string[]) => (items.length ? [`${label}:`, ...items.map((i) => `• ${i}`)] : []);

/** A chapter's public overview (sales mode, and context for members). */
export function courseDoc(course: CourseRow, coursesById: ReadonlyMap<string, CourseRow>, lessonTitles: readonly string[] = []): KnowledgeDoc {
  const required = course.requires_course_id ? coursesById.get(course.requires_course_id) : undefined;
  const lines = [
    course.description ?? "",
    required ? `Take ${chapterLabel(required)} first.` : "",
    course.before_you_start ? `Before you start: ${course.before_you_start}` : "",
    ...list("What you need", needsText(course.what_you_need)),
    ...list("Lessons", lessonTitles),
  ];
  return { id: `course:${course.id}`, title: chapterLabel(course), text: normalizeSpace(lines.filter(Boolean).join("\n")) };
}

/** A lesson's full content (member mode only). */
export function lessonDoc(lesson: LessonRow, course: Pick<CourseRow, "title" | "chapter_number"> | undefined): KnowledgeDoc {
  const lines = [
    lesson.description ?? "",
    stripHtml(lesson.body_html),
    ...list("Key takeaways", (lesson.key_takeaways ?? []).filter(Boolean)),
    ...list("Cues", (lesson.cues ?? []).filter(Boolean)),
    ...list(`Practice steps${lesson.practice_minutes ? ` (about ${lesson.practice_minutes} minutes)` : ""}`, stepsText(lesson.practice_steps)),
  ];
  const where = course ? `${chapterLabel(course)} › ` : "";
  return { id: `lesson:${lesson.id}`, title: `${where}Lesson: ${lesson.title}`, text: normalizeSpace(lines.filter(Boolean).join("\n")) || lesson.title };
}

/** A published one-time offer: its price and the chapters it includes. */
export function offerDoc(offer: OfferInfo, coursesById: ReadonlyMap<string, CourseRow>, index: number): KnowledgeDoc {
  const chapters = offer.courseIds.flatMap((id) => {
    const course = coursesById.get(id);
    return course ? [chapterLabel(course)] : [];
  });
  const access = offer.daysOfAccess ? `${offer.daysOfAccess} days of access` : "lifetime access";
  const lines = [`Price: ${offer.priceLabel}, one-time payment, ${access}.`, ...list("Includes", chapters)];
  return { id: `offer:${index}`, title: `Offer: ${offer.title}`, text: lines.join("\n") };
}

const byChapterThenPosition = (courses: ReadonlyMap<string, CourseRow>) => (a: LessonRow, b: LessonRow) =>
  (courses.get(a.course_id)?.chapter_number ?? 99) - (courses.get(b.course_id)?.chapter_number ?? 99) ||
  a.course_id.localeCompare(b.course_id) ||
  a.position - b.position;

/** Lesson titles per chapter, in order. */
function titlesByCourse(lessons: readonly LessonRow[]): Map<string, string[]> {
  return lessons.reduce((acc, l) => acc.set(l.course_id, [...(acc.get(l.course_id) ?? []), l.title]), new Map<string, string[]>());
}

export interface SalesRows {
  /** Published chapters only. */
  courses: ReadonlyMap<string, CourseRow>;
  lessons: readonly LessonRow[];
  modules: ReadonlyMap<string, ModuleRow>;
  offers: readonly OfferInfo[];
}

/** Visitors: chapter overviews with lesson TITLES (never lesson content), then the offers. */
export function buildSalesDocs({ courses, lessons, modules, offers }: SalesRows): KnowledgeDoc[] {
  const live = lessons.filter((l) => courses.has(l.course_id) && isLessonLive(l, modules)).sort(byChapterThenPosition(courses));
  const titles = titlesByCourse(live);
  const ordered = [...courses.values()].sort((a, b) => (a.chapter_number ?? 99) - (b.chapter_number ?? 99));
  // An offer for chapters that aren't published yet has no price to quote.
  const forSale = offers.filter((o) => o.courseIds.some((id) => courses.has(id)));
  return [...ordered.map((c) => courseDoc(c, courses, titles.get(c.id) ?? [])), ...forSale.map((o, i) => offerDoc(o, courses, i))];
}

export interface MemberRows {
  /** Published chapters only. */
  courses: ReadonlyMap<string, CourseRow>;
  /** Chapters with full, unexpired access → when the member enrolled (drip). */
  access: ReadonlyMap<string, string>;
  /** Lessons of those chapters plus free previews (with content). */
  lessons: readonly LessonRow[];
  modules: ReadonlyMap<string, ModuleRow>;
  now: Date;
}

/** Members: overviews of their chapters, then every lesson they can open (quizzes left out: no answers). */
export function buildMemberDocs({ courses, access, lessons, modules, now }: MemberRows): KnowledgeDoc[] {
  const visible = lessons
    .filter((l) => courses.has(l.course_id) && l.kind !== "quiz" && isLessonLive(l, modules))
    .filter((l) => {
      const enrolledAt = access.get(l.course_id);
      return l.free_preview || (enrolledAt !== undefined && isDripOpen(l, enrolledAt, now));
    })
    .sort(byChapterThenPosition(courses));
  const titles = titlesByCourse(visible);
  const overviews = [...access.keys()].flatMap((id) => {
    const course = courses.get(id);
    return course ? [courseDoc(course, courses, titles.get(id) ?? [])] : [];
  });
  return [...overviews, ...visible.map((l) => lessonDoc(l, courses.get(l.course_id)))];
}
