/**
 * Turns the Kajabi export (data/kajabi/bonded-courses.json, read-only copy of the client's Kajabi
 * courses) into an import plan: our course ids, module tree, lessons, paywall and chapter order.
 */
export interface KajabiModule {
  k: string; // Kajabi category id
  t: string;
  d: string | null;
  p: string | null; // parent category id
  s: 0 | 1; // published
  w: 0 | 1; // Kajabi's "Paywall Wrapper" marker
  r: number | null; // drip days
  i: string | null;
}

export interface KajabiLesson {
  k: string; // Kajabi post id
  t: string;
  c: string; // category id
  s: 0 | 1;
  b: string | null; // body html
  i: string | null; // thumbnail file
  v: 0 | 1; // had a (Wistia) video in Kajabi
}

export interface KajabiCourse {
  t: string;
  d: string | null;
  i: string | null;
  m: KajabiModule[]; // in Kajabi order
  l: KajabiLesson[]; // in Kajabi order
}

export interface KajabiExport {
  imgBase: string;
  courses: Record<string, KajabiCourse>;
}

export interface PlannedLesson {
  ref: string;
  title: string;
  published: boolean;
  position: number;
  bodyHtml: string | null;
  vimeoUrl: string | null;
  thumbnailUrl: string | null;
  hadVideo: boolean;
  availableAfterDays: number | null;
}

export interface PlannedModule {
  ref: string;
  title: string;
  description: string | null;
  published: boolean;
  position: number;
  lessons: PlannedLesson[];
  children: PlannedModule[];
}

export interface PlannedCourse {
  key: string;
  ref: string;
  id: string;
  title: string;
  description: string;
  level: string;
  category: string;
  chapterNumber: number;
  requiresCourseId: string | null;
  imageUrl: string | null;
  paywallAfterRef: string | null;
  modules: PlannedModule[];
}

/** Our ids, chapter order and labels for the three Bonded courses. */
const COURSE_META: Record<string, { id: string; chapter: number; level: string; category: string; requires: string | null }> = {
  foundations: { id: "bonded-foundations", chapter: 1, level: "Beginner", category: "Foundations", requires: null },
  moves: { id: "bonded-moves", chapter: 2, level: "Intermediate", category: "Moves", requires: "bonded-foundations" },
  dance: { id: "bonded-lets-dance", chapter: 3, level: "Advanced", category: "Let's Dance", requires: "bonded-moves" },
};

const VIMEO_ONLY = /^<p>\s*(https:\/\/(?:www\.)?vimeo\.com\/[^\s<]+)\s*<\/p>$/i;

/** A body that is only a Vimeo link becomes the lesson video; anything else stays as text. */
export function splitBody(body: string | null): { bodyHtml: string | null; vimeoUrl: string | null } {
  const trimmed = body?.trim() ?? "";
  if (!trimmed) return { bodyHtml: null, vimeoUrl: null };
  const m = trimmed.match(VIMEO_ONLY);
  if (m) return { bodyHtml: null, vimeoUrl: m[1].replace(/&amp;/g, "&") };
  return { bodyHtml: trimmed, vimeoUrl: null };
}

export function planCourse(key: string, course: KajabiCourse, imgBase: string): PlannedCourse {
  const meta = COURSE_META[key] ?? { id: `kajabi-${key}`, chapter: 99, level: "All levels", category: course.t, requires: null };
  const img = (file: string | null) => (file ? `${imgBase}${file}` : null);
  const lessonsOf = (moduleRef: string) =>
    course.l
      .filter((l) => l.c === moduleRef)
      .map((l, i): PlannedLesson => {
        const { bodyHtml, vimeoUrl } = splitBody(l.b);
        return {
          ref: `kajabi:${l.k}`,
          title: l.t.trim(),
          published: l.s === 1,
          position: i + 1,
          bodyHtml,
          vimeoUrl,
          thumbnailUrl: img(l.i),
          hadVideo: l.v === 1,
          availableAfterDays: null,
        };
      });
  const moduleOf = (m: KajabiModule, position: number): PlannedModule => ({
    ref: `kajabi:${m.k}`,
    title: m.t.trim(),
    description: m.d?.trim() || null,
    published: m.s === 1,
    position,
    lessons: lessonsOf(m.k).map((l) => ({ ...l, availableAfterDays: m.r })),
    children: course.m.filter((c) => c.p === m.k && !c.w).map((c, i) => moduleOf(c, i + 1)),
  });

  const topLevel = course.m.filter((m) => !m.p);
  const paywallIndex = topLevel.findIndex((m) => m.w === 1);
  const beforePaywall = paywallIndex > 0 ? topLevel.slice(0, paywallIndex).filter((m) => !m.w).at(-1) : undefined;

  return {
    key,
    ref: `kajabi:course:${key}`,
    id: meta.id,
    title: course.t.trim(),
    description: course.d?.trim() || course.t.trim(),
    level: meta.level,
    category: meta.category,
    chapterNumber: meta.chapter,
    requiresCourseId: meta.requires,
    imageUrl: img(course.i),
    paywallAfterRef: beforePaywall ? `kajabi:${beforePaywall.k}` : null,
    modules: topLevel.filter((m) => !m.w).map((m, i) => moduleOf(m, i + 1)),
  };
}

export function planImport(data: KajabiExport): PlannedCourse[] {
  return Object.entries(data.courses)
    .map(([key, c]) => planCourse(key, c, data.imgBase))
    .sort((a, b) => a.chapterNumber - b.chapterNumber);
}

export function countPlan(course: PlannedCourse): { modules: number; lessons: number; withText: number; withThumb: number } {
  const all = (mods: PlannedModule[]): PlannedModule[] => mods.flatMap((m) => [m, ...all(m.children)]);
  const mods = all(course.modules);
  const lessons = mods.flatMap((m) => m.lessons);
  return { modules: mods.length, lessons: lessons.length, withText: lessons.filter((l) => l.bodyHtml).length, withThumb: lessons.filter((l) => l.thumbnailUrl).length };
}
