import { describe, expect, it } from "vitest";
import { isMoveImageUrl, matchesMoveSearch, moveImagePath } from "./moves";

describe("matchesMoveSearch", () => {
  const move = { name: "Paws Up", slug: "paws-up", cue: "Up!" };

  it("matches everything for a blank query", () => {
    expect(matchesMoveSearch(move, "  ")).toBe(true);
  });

  it("matches name, slug or cue case-insensitively", () => {
    expect(matchesMoveSearch(move, "paws")).toBe(true);
    expect(matchesMoveSearch(move, "PAWS-UP")).toBe(true);
    expect(matchesMoveSearch(move, "up!")).toBe(true);
    expect(matchesMoveSearch({ ...move, cue: null }, "spin")).toBe(false);
  });
});

describe("move images", () => {
  const base = "http://127.0.0.1:55621/storage/v1/object/public/course-images/";

  it("builds a path under the moves/ prefix", () => {
    expect(moveImagePath("Photo.JPG", "abc")).toBe("moves/abc.jpg");
  });

  it("accepts only public URLs of our moves/ folder", () => {
    expect(isMoveImageUrl(`${base}moves/abc.jpg`, base)).toBe(true);
    expect(isMoveImageUrl(`${base}kinetic/abc.jpg`, base)).toBe(false);
    expect(isMoveImageUrl(`${base}moves/../x.jpg`, base)).toBe(false);
    expect(isMoveImageUrl("https://evil.example/moves/abc.jpg", base)).toBe(false);
  });
});
