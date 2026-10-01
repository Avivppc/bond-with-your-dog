import { expect, test } from "vitest";
import { resumeFrom, resumePoint } from "./resume";

test("picks up a few seconds before where the member stopped", () => {
  expect(resumePoint({ watchSeconds: 321, completed: false })).toBe(318);
});

test("starts from the top when the lesson is done or barely started", () => {
  expect(resumePoint({ watchSeconds: 321, completed: true })).toBeNull();
  expect(resumePoint({ watchSeconds: 8, completed: false })).toBeNull();
  expect(resumePoint({ watchSeconds: null, completed: false })).toBeNull();
});

test("once the video's length is known, the last seconds count as finished", () => {
  expect(resumeFrom(318, 600)).toBe(318);
  expect(resumeFrom(590, 600)).toBe(0);
  expect(resumeFrom(318, 0)).toBe(318); // length unknown: trust the saved point
  expect(resumeFrom(null, 600)).toBe(0);
});
