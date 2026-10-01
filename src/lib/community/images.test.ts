import { describe, expect, test } from "vitest";
import { communityCoverPath, isAllowedImageUrl } from "./images";

const BASE = "http://127.0.0.1:55621/storage/v1/object/public/course-images/";

describe("isAllowedImageUrl", () => {
  test("accepts blank, any https link and our own uploaded images", () => {
    expect(isAllowedImageUrl("", BASE)).toBe(true);
    expect(isAllowedImageUrl("https://images.example.com/cover.jpg", BASE)).toBe(true);
    expect(isAllowedImageUrl(`${BASE}community/abc-123.png`, BASE)).toBe(true);
  });

  test("rejects other http links, other folders of our bucket and junk", () => {
    expect(isAllowedImageUrl("http://images.example.com/cover.jpg", BASE)).toBe(false);
    expect(isAllowedImageUrl(`${BASE}moves/abc.png`, BASE)).toBe(false);
    expect(isAllowedImageUrl("javascript:alert(1)", BASE)).toBe(false);
    expect(isAllowedImageUrl("https://has space.com/x.png", BASE)).toBe(false);
  });
});

test("communityCoverPath keeps the extension, lowercased, in the community/ folder", () => {
  expect(communityCoverPath("Cover Photo.JPG", "1f2e")).toBe("community/1f2e.jpg");
  expect(communityCoverPath("a.webp", "x9")).toBe("community/x9.webp");
});
