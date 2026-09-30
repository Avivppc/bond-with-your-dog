import { describe, expect, it } from "vitest";
import { courseProgress, lessonNeighbors } from "./course-progress";

const lessons = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];

describe("courseProgress", () => {
  it("counts completed lessons in the course and picks the first unfinished one as next", () => {
    const result = courseProgress(lessons, new Set(["a", "c", "zz-other-course"]));
    expect(result).toEqual({ completed: 2, total: 4, percent: 50, next: { id: "b" } });
  });

  it("has no next lesson when everything is done, and 0% for an empty course", () => {
    expect(courseProgress(lessons, new Set(["a", "b", "c", "d"])).next).toBeNull();
    expect(courseProgress([], new Set())).toEqual({ completed: 0, total: 0, percent: 0, next: null });
  });

  it("rounds the percentage", () => {
    expect(courseProgress(lessons.slice(0, 3), new Set(["a"])).percent).toBe(33);
  });
});

describe("lessonNeighbors", () => {
  it("returns the lessons before and after in reading order", () => {
    expect(lessonNeighbors(lessons, "b")).toEqual({ prev: { id: "a" }, next: { id: "c" }, number: 2 });
    expect(lessonNeighbors(lessons, "a").prev).toBeNull();
    expect(lessonNeighbors(lessons, "d").next).toBeNull();
  });

  it("returns nothing for a lesson that isn't in the list", () => {
    expect(lessonNeighbors(lessons, "x")).toEqual({ prev: null, next: null, number: 0 });
  });
});
