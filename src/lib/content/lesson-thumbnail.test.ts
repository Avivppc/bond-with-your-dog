import { describe, expect, it } from "vitest";
import { effectiveThumbnail, isLessonThumbnailPath, lessonThumbnailPath, lessonThumbnailPathFromUrl } from "./lesson-thumbnail";

const LESSON = "d0000000-0000-0000-0000-0000000000f1";
const OTHER = "d0000000-0000-0000-0000-0000000000f2";
const UNIQUE = "0b8f8a52-6a4e-4c1e-9d1e-3f1e2a7b9c00";
const BASE = "http://127.0.0.1:55621/storage/v1/object/public/course-images/";

describe("lessonThumbnailPath", () => {
  it("puts the upload in the lesson's folder with a lowercase extension", () => {
    expect(lessonThumbnailPath(LESSON, "My Photo.JPG", UNIQUE)).toBe(`lessons/${LESSON}/${UNIQUE}.jpg`);
  });
});

describe("isLessonThumbnailPath", () => {
  it("accepts only image objects inside this lesson's folder", () => {
    expect(isLessonThumbnailPath(`lessons/${LESSON}/${UNIQUE}.webp`, LESSON)).toBe(true);
    expect(isLessonThumbnailPath(`lessons/${OTHER}/${UNIQUE}.webp`, LESSON)).toBe(false);
    expect(isLessonThumbnailPath(`lessons/${LESSON}/../x.jpg`, LESSON)).toBe(false);
    expect(isLessonThumbnailPath(`lessons/${LESSON}/${UNIQUE}.svg`, LESSON)).toBe(false);
    expect(isLessonThumbnailPath(`moves/${UNIQUE}.jpg`, LESSON)).toBe(false);
  });
});

describe("lessonThumbnailPathFromUrl", () => {
  it("returns the storage path of this lesson's public URL", () => {
    expect(lessonThumbnailPathFromUrl(`${BASE}lessons/${LESSON}/${UNIQUE}.png`, BASE, LESSON)).toBe(`lessons/${LESSON}/${UNIQUE}.png`);
  });

  it("ignores missing, foreign and other lessons' URLs", () => {
    expect(lessonThumbnailPathFromUrl(null, BASE, LESSON)).toBeNull();
    expect(lessonThumbnailPathFromUrl(`https://evil.example/lessons/${LESSON}/${UNIQUE}.png`, BASE, LESSON)).toBeNull();
    expect(lessonThumbnailPathFromUrl(`${BASE}lessons/${OTHER}/${UNIQUE}.png`, BASE, LESSON)).toBeNull();
  });
});

describe("effectiveThumbnail", () => {
  it("prefers the upload over the video thumbnail", () => {
    expect(effectiveThumbnail("https://a/u.jpg", "https://v/t.jpg")).toEqual({ url: "https://a/u.jpg", source: "upload" });
  });

  it("falls back to the video thumbnail, then nothing", () => {
    expect(effectiveThumbnail(null, "https://v/t.jpg")).toEqual({ url: "https://v/t.jpg", source: "video" });
    expect(effectiveThumbnail(null, null)).toEqual({ url: null, source: "none" });
  });
});
