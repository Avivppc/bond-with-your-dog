import { expect, test } from "vitest";
import { buildSubjectOptions, defaultSubject, moveLabel, OTHER_SUBJECT } from "./subjects";

const moves = [
  { id: "m1", slug: "spin", name: "Spin", lesson_id: "l5", course_title: "Foundations", lesson_position: 5 },
  { id: "m2", slug: "wave", name: "Wave", lesson_id: null, course_title: null, lesson_position: null },
];
const lessons = [
  { id: "l5", title: "Your First Spin", course_title: "Foundations" },
  { id: "l6", title: "Body Awareness", course_title: "Foundations" },
];

test("moveLabel follows the design", () => {
  expect(moveLabel(moves[0])).toBe("Spin · Foundations, Lesson 5");
  expect(moveLabel(moves[1])).toBe("Wave");
});

test("options list moves, then lessons, then something else", () => {
  const options = buildSubjectOptions(moves, lessons);
  expect(options.map((o) => o.value)).toEqual(["move:m1", "move:m2", "lesson:l5", "lesson:l6", OTHER_SUBJECT]);
  expect(options[0]).toMatchObject({ moveId: "m1", lessonId: "l5" });
  expect(options[4]).toMatchObject({ moveId: null, lessonId: null, label: "Something else" });
});

test("preselects from ?move= or ?lesson=", () => {
  const options = buildSubjectOptions(moves, lessons);
  expect(defaultSubject(options, moves, { move: "wave" })).toBe("move:m2");
  expect(defaultSubject(options, moves, { lesson: "l5" })).toBe("move:m1");
  expect(defaultSubject(options, moves, { lesson: "l6" })).toBe("lesson:l6");
  expect(defaultSubject(options, moves, { lesson: "missing" })).toBe("move:m1");
  expect(defaultSubject(buildSubjectOptions([], []), [], {})).toBe(OTHER_SUBJECT);
});
