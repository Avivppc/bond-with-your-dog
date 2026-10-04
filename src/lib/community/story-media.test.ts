import { describe, expect, it } from "vitest";
import { guestStoryPhotoPath, isGuestStoryPhotoPath, isOwnStoryPhotoPath, isPreviewablePhoto, storyPhotoPath, storyPhotoType, validateStoryPhoto } from "./story-media";

const UID = "00000000-0000-0000-0000-000000000001";
const OTHER = "00000000-0000-0000-0000-000000000002";

describe("storyPhotoType / validateStoryPhoto", () => {
  it("accepts JPG, PNG, WebP and HEIC up to 10 MB", () => {
    expect(validateStoryPhoto({ name: "a.jpg", size: 1_000, type: "image/jpeg" })).toBeNull();
    expect(validateStoryPhoto({ name: "a.heic", size: 1_000, type: "image/heic" })).toBeNull();
    expect(validateStoryPhoto({ name: "a.png", size: 11 * 1024 * 1024, type: "image/png" })).toMatch(/10 MB/);
  });

  it("recognises HEIC by extension when the browser gives no type", () => {
    expect(storyPhotoType({ name: "IMG_0001.HEIC", type: "" })).toBe("image/heic");
    expect(storyPhotoType({ name: "IMG_0001.heif", type: "application/octet-stream" })).toBe("image/heic");
    expect(storyPhotoType({ name: "clip.mov", type: "" })).toBeNull();
  });

  it("rejects other files", () => {
    expect(validateStoryPhoto({ name: "a.gif", size: 10, type: "image/gif" })).toMatch(/JPG/);
    expect(validateStoryPhoto({ name: "a.pdf", size: 10, type: "application/pdf" })).toMatch(/JPG/);
  });
});

describe("storyPhotoPath / isOwnStoryPhotoPath", () => {
  it("puts photos in the member's stories folder", () => {
    expect(storyPhotoPath(UID, "image/webp", "abc")).toBe(`${UID}/stories/abc.webp`);
    expect(storyPhotoPath(UID, "image/heif", "abc")).toBe(`${UID}/stories/abc.heic`);
  });

  it("accepts only the member's own story photos", () => {
    expect(isOwnStoryPhotoPath(storyPhotoPath(UID, "image/jpeg", "abc"), UID)).toBe(true);
    expect(isOwnStoryPhotoPath(storyPhotoPath(OTHER, "image/jpeg", "abc"), UID)).toBe(false);
    expect(isOwnStoryPhotoPath(`${UID}/avatar.jpg`, UID)).toBe(false);
    expect(isOwnStoryPhotoPath(`${UID}/stories/../x.jpg`, UID)).toBe(false);
    expect(isOwnStoryPhotoPath(`${UID}/stories/a/b.jpg`, UID)).toBe(false);
    expect(isOwnStoryPhotoPath(`${UID}/stories/a.gif`, UID)).toBe(false);
  });

  it("previews everything but HEIC", () => {
    expect(isPreviewablePhoto(`${UID}/stories/a.jpg`)).toBe(true);
    expect(isPreviewablePhoto(`${UID}/stories/a.heic`)).toBe(false);
  });
});

describe("guestStoryPhotoPath / isGuestStoryPhotoPath", () => {
  const session = "11111111-1111-1111-1111-111111111111";

  it("puts a visitor's photo under guest/<their upload session>", () => {
    const path = guestStoryPhotoPath(session, "image/png", "abc-123");
    expect(path).toBe(`guest/${session}/stories/abc-123.png`);
    expect(isGuestStoryPhotoPath(path, session)).toBe(true);
  });

  it("refuses another session's photos, member folders and odd names", () => {
    expect(isGuestStoryPhotoPath(`guest/22222222-2222-2222-2222-222222222222/stories/a.jpg`, session)).toBe(false);
    expect(isGuestStoryPhotoPath(`${session}/stories/a.jpg`, session)).toBe(false);
    expect(isGuestStoryPhotoPath(`guest/${session}/stories/../x.jpg`, session)).toBe(false);
    expect(isGuestStoryPhotoPath(`guest/${session}/stories/a.gif`, session)).toBe(false);
  });
});
