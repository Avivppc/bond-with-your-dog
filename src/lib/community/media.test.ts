import { describe, expect, it } from "vitest";
import { communityImagePath, validateCommunityImage } from "./media";

describe("validateCommunityImage", () => {
  it("accepts common photo formats up to 10 MB", () => {
    expect(validateCommunityImage({ name: "rex.jpg", size: 2_000_000, type: "image/jpeg" })).toBeNull();
    expect(validateCommunityImage({ name: "rex.webp", size: 10 * 1024 * 1024, type: "image/webp" })).toBeNull();
  });

  it("rejects other types and big files", () => {
    expect(validateCommunityImage({ name: "rex.svg", size: 100, type: "image/svg+xml" })).toMatch(/JPG, PNG, WebP or GIF/);
    expect(validateCommunityImage({ name: "rex.jpg", size: 11 * 1024 * 1024, type: "image/jpeg" })).toMatch(/10 MB/);
  });
});

describe("communityImagePath", () => {
  it("puts uploads in the member's own folder with a safe extension", () => {
    expect(communityImagePath("user-1", "My Dog!.PNG", "abc")).toBe("user-1/abc.png");
    expect(communityImagePath("user-1", "noext", "abc")).toBe("user-1/abc.jpg");
  });
});
