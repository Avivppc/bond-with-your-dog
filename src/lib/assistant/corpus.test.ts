import { describe, expect, test } from "vitest";
import { buildMemberDocs, buildSalesDocs, isLessonLive, type CourseRow, type LessonRow, type ModuleRow } from "./corpus";

const NOW = new Date("2026-10-03T12:00:00Z");

const course = (id: string, n: number, extra: Partial<CourseRow> = {}): CourseRow => ({
  id,
  title: id === "f" ? "Foundations" : "Moves",
  description: `${id} description`,
  chapter_number: n,
  requires_course_id: null,
  what_you_need: [{ icon: "pets", label: "Treats" }],
  before_you_start: null,
  ...extra,
});

const lesson = (id: string, courseId: string, extra: Partial<LessonRow> = {}): LessonRow => ({
  id,
  course_id: courseId,
  module_id: null,
  position: 1,
  title: `Lesson ${id}`,
  kind: "video",
  description: null,
  free_preview: false,
  published: true,
  available_after_days: null,
  body_html: `<p>SECRET body of ${id}</p>`,
  key_takeaways: [`takeaway ${id}`],
  cues: [],
  practice_steps: [{ title: "Lure", body: "Hold the treat" }],
  practice_minutes: 5,
  ...extra,
});

const courses = new Map([
  ["f", course("f", 1)],
  ["m", course("m", 2, { requires_course_id: "f" })],
]);
const modules = new Map<string, ModuleRow>([
  ["live", { id: "live", parent_id: null, published: true }],
  ["draft", { id: "draft", parent_id: null, published: false }],
  ["child", { id: "child", parent_id: "draft", published: true }],
]);

describe("isLessonLive", () => {
  test("follows public.is_module_live", () => {
    expect(isLessonLive({ published: true, module_id: null }, modules)).toBe(true);
    expect(isLessonLive({ published: false, module_id: null }, modules)).toBe(false);
    expect(isLessonLive({ published: true, module_id: "live" }, modules)).toBe(true);
    expect(isLessonLive({ published: true, module_id: "draft" }, modules)).toBe(false);
    expect(isLessonLive({ published: true, module_id: "child" }, modules)).toBe(false);
    expect(isLessonLive({ published: true, module_id: "missing" }, modules)).toBe(false);
  });
});

describe("buildSalesDocs", () => {
  const docs = buildSalesDocs({
    courses,
    lessons: [lesson("1", "f"), lesson("2", "m", { module_id: "draft", title: "Hidden draft" })],
    modules,
    offers: [
      { title: "Moves", priceLabel: "$97", daysOfAccess: null, courseIds: ["m"] },
      { title: "Unreleased", priceLabel: "$50", daysOfAccess: 30, courseIds: ["draft-chapter"] },
    ],
  });
  const all = docs.map((d) => `${d.title}\n${d.text}`).join("\n");

  test("has chapter overviews in order, then offers with prices", () => {
    expect(docs.map((d) => d.title)).toEqual(["Chapter 1: Foundations", "Chapter 2: Moves", "Offer: Moves"]);
    expect(all).toContain("Price: $97, one-time payment, lifetime access.");
    expect(all).toContain("Take Chapter 1: Foundations first.");
    expect(all).toContain("• Treats");
  });

  test("leaves out offers for chapters that aren't published", () => {
    expect(all).not.toContain("Unreleased");
    expect(all).not.toContain("$50");
  });

  test("lists live lesson titles but never lesson content", () => {
    expect(all).toContain("Lesson 1");
    expect(all).not.toContain("Hidden draft");
    expect(all).not.toContain("SECRET");
    expect(all).not.toContain("takeaway");
    expect(all).not.toContain("Hold the treat");
  });
});

describe("buildMemberDocs", () => {
  const lessons = [
    lesson("own", "f"),
    lesson("drip", "f", { position: 2, available_after_days: 30 }),
    lesson("quiz", "f", { position: 3, kind: "quiz" }),
    lesson("locked", "m"),
    lesson("preview", "m", { free_preview: true, position: 2 }),
    lesson("draftpreview", "m", { free_preview: true, published: false }),
  ];
  const docs = buildMemberDocs({ courses, access: new Map([["f", "2026-10-01T00:00:00Z"]]), lessons, modules, now: NOW });
  const ids = docs.map((d) => d.id);

  test("includes full content of the member's lessons and free previews", () => {
    expect(ids).toEqual(["course:f", "lesson:own", "lesson:preview"]);
    const own = docs.find((d) => d.id === "lesson:own");
    expect(own?.title).toBe("Chapter 1: Foundations › Lesson: Lesson own");
    expect(own?.text).toContain("SECRET body of own");
    expect(own?.text).toContain("1. Lure: Hold the treat");
  });

  test("leaves out other chapters, lessons not open yet (drip), quizzes and drafts", () => {
    for (const hidden of ["lesson:locked", "lesson:drip", "lesson:quiz", "lesson:draftpreview"]) expect(ids).not.toContain(hidden);
  });

  test("opens a drip lesson once its day has come", () => {
    const later = buildMemberDocs({ courses, access: new Map([["f", "2026-08-01T00:00:00Z"]]), lessons, modules, now: NOW });
    expect(later.map((d) => d.id)).toContain("lesson:drip");
  });
});
