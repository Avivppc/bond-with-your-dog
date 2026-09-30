import { describe, expect, it } from "vitest";
import { MAX_COURSE_IMAGE_BYTES, MAX_LESSON_FILE_BYTES, lessonFilePath, validateCourseImage, validateLessonFile } from "./lesson-files";

describe("validateLessonFile", () => {
  it("accepts common course materials", () => {
    expect(validateLessonFile({ name: "Guide.pdf", size: 1_000_000, type: "application/pdf" })).toBeNull();
    expect(validateLessonFile({ name: "worksheet.docx", size: 10, type: "" })).toBeNull();
    expect(validateLessonFile({ name: "music.mp3", size: 10, type: "audio/mpeg" })).toBeNull();
  });

  it("rejects empty, oversized and executable files", () => {
    expect(validateLessonFile({ name: "a.pdf", size: 0, type: "application/pdf" })).toMatch(/empty/i);
    expect(validateLessonFile({ name: "a.pdf", size: MAX_LESSON_FILE_BYTES + 1, type: "application/pdf" })).toMatch(/too large/i);
    expect(validateLessonFile({ name: "setup.exe", size: 10, type: "application/octet-stream" })).toMatch(/not allowed/i);
    expect(validateLessonFile({ name: "page.html", size: 10, type: "text/html" })).toMatch(/not allowed/i);
    expect(validateLessonFile({ name: "noextension", size: 10, type: "" })).toMatch(/not allowed/i);
  });
});

describe("lessonFilePath", () => {
  it("namespaces by lesson and keeps a safe, unique file name", () => {
    const path = lessonFilePath("lesson-1", "My Guide (final).PDF", "abc123");
    expect(path).toBe("lesson-1/abc123-my-guide-final.pdf");
  });

  it("never lets a file name escape its folder", () => {
    expect(lessonFilePath("lesson-1", "../../etc/passwd.pdf", "id")).toBe("lesson-1/id-etc-passwd.pdf");
  });
});

describe("validateCourseImage", () => {
  it("accepts web images up to the size limit", () => {
    expect(validateCourseImage({ name: "cover.JPG", size: 200_000, type: "image/jpeg" })).toBeNull();
    expect(validateCourseImage({ name: "cover.webp", size: 10, type: "image/webp" })).toBeNull();
  });

  it("rejects other types and oversized images", () => {
    expect(validateCourseImage({ name: "cover.pdf", size: 10, type: "application/pdf" })).toMatch(/image/i);
    expect(validateCourseImage({ name: "cover.svg", size: 10, type: "image/svg+xml" })).toMatch(/image/i);
    expect(validateCourseImage({ name: "cover.png", size: MAX_COURSE_IMAGE_BYTES + 1, type: "image/png" })).toMatch(/too large/i);
  });
});
