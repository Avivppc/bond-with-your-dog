import { describe, expect, it } from "vitest";
import { isLibraryUrl, mediaName, mediaOrigin, parseMediaSource } from "./sources";

describe("mediaOrigin", () => {
  it("names where an image came from", () => {
    expect(mediaOrigin("site-media", "2026/a.jpg")).toBe("Website & library");
    expect(mediaOrigin("course-images", "imported/x/a.jpg")).toBe("Imported from Kajabi");
    expect(mediaOrigin("course-images", "lessons/123/a.jpg")).toBe("Lesson thumbnail");
    expect(mediaOrigin("course-images", "bonded-foundations/a.jpg")).toBe("Course cover");
  });
});

describe("mediaName / parseMediaSource", () => {
  it("shows the file name and falls back to all sources", () => {
    expect(mediaName("2026/ab12.jpg")).toBe("ab12.jpg");
    expect(parseMediaSource("courses")).toBe("courses");
    expect(parseMediaSource("nope")).toBe("all");
  });
});

describe("isLibraryUrl", () => {
  const bases = ["https://x.supabase.co/storage/v1/object/public/site-media/", "https://x.supabase.co/storage/v1/object/public/course-images/"];

  it("accepts files of the library buckets only", () => {
    expect(isLibraryUrl(`${bases[0]}2026/a.jpg`, bases)).toBe(true);
    expect(isLibraryUrl(`${bases[1]}imported/a.png`, bases)).toBe(true);
    expect(isLibraryUrl("https://evil.example/a.jpg", bases)).toBe(false);
    expect(isLibraryUrl(bases[0], bases)).toBe(false);
    expect(isLibraryUrl(`${bases[0]}../lesson-files/x.pdf`, bases)).toBe(false);
  });
});
