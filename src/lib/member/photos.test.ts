import { describe, expect, it } from "vitest";
import { isOwnPhotoUrl, profilePhotoPath, validateProfilePhoto } from "./photos";

const SB = "http://127.0.0.1:55621";
const UID = "00000000-0000-0000-0000-000000000001";

describe("validateProfilePhoto", () => {
  it("accepts small JPG/PNG/WebP photos", () => {
    expect(validateProfilePhoto({ size: 100_000, type: "image/jpeg" })).toBeNull();
  });
  it("rejects other types and large files", () => {
    expect(validateProfilePhoto({ size: 100, type: "image/gif" })).toMatch(/JPG/);
    expect(validateProfilePhoto({ size: 6 * 1024 * 1024, type: "image/png" })).toMatch(/5 MB/);
  });
});

describe("profilePhotoPath", () => {
  it("puts the photo in the member's folder with the right extension", () => {
    expect(profilePhotoPath(UID, "dog", "image/webp", "abc")).toBe(`${UID}/dog-abc.webp`);
  });
});

describe("isOwnPhotoUrl", () => {
  const own = `${SB}/storage/v1/object/public/profile-photos/${UID}/avatar-abc.jpg`;
  it("accepts the member's own public photo", () => {
    expect(isOwnPhotoUrl(own, SB, UID)).toBe(true);
    expect(isOwnPhotoUrl(own, `${SB}/`, UID)).toBe(true);
  });
  it("rejects other folders, other buckets, traversal and other hosts", () => {
    expect(isOwnPhotoUrl(own.replace(UID, "someone-else"), SB, UID)).toBe(false);
    expect(isOwnPhotoUrl(own.replace("profile-photos", "course-images"), SB, UID)).toBe(false);
    expect(isOwnPhotoUrl(`${SB}/storage/v1/object/public/profile-photos/${UID}/../x/a.jpg`, SB, UID)).toBe(false);
    expect(isOwnPhotoUrl("https://evil.example/a.jpg", SB, UID)).toBe(false);
  });
});
