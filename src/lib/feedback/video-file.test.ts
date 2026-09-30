import { describe, expect, test } from "vitest";
import { checkVideoDuration, checkVideoFile, formatBytes, MAX_VIDEO_BYTES } from "./video-file";

describe("checkVideoFile", () => {
  test("accepts MP4 and MOV clips", () => {
    expect(checkVideoFile({ name: "spin.mp4", type: "video/mp4", size: 10_000 })).toBeNull();
    expect(checkVideoFile({ name: "IMG_0042.MOV", type: "video/quicktime", size: 10_000 })).toBeNull();
    expect(checkVideoFile({ name: "clip.mov", type: "", size: 10_000 })).toBeNull();
  });

  test("rejects other formats, empty and oversized files", () => {
    expect(checkVideoFile({ name: "clip.avi", type: "video/x-msvideo", size: 10 })).toMatch(/MP4 or MOV/);
    expect(checkVideoFile({ name: "photo.jpg", type: "image/jpeg", size: 10 })).toMatch(/MP4 or MOV/);
    expect(checkVideoFile({ name: "spin.mp4", type: "video/mp4", size: 0 })).toMatch(/empty/);
    expect(checkVideoFile({ name: "spin.mp4", type: "video/mp4", size: MAX_VIDEO_BYTES + 1 })).toMatch(/too large/);
  });
});

describe("checkVideoDuration", () => {
  test("allows clips up to two minutes", () => {
    expect(checkVideoDuration(34)).toBeNull();
    expect(checkVideoDuration(120)).toBeNull();
    expect(checkVideoDuration(120.6)).toBeNull();
  });

  test("rejects longer clips with the actual length", () => {
    expect(checkVideoDuration(154)).toBe("This clip is 2:34 long. Please trim it to 2 minutes or less.");
  });

  test("rejects unreadable lengths", () => {
    expect(checkVideoDuration(Number.NaN)).toMatch(/couldn't read/);
    expect(checkVideoDuration(Number.POSITIVE_INFINITY)).toMatch(/couldn't read/);
    expect(checkVideoDuration(null)).toMatch(/couldn't read/);
  });
});

test("formatBytes shows MB and GB", () => {
  expect(formatBytes(12.4 * 1024 * 1024)).toBe("12.4 MB");
  expect(formatBytes(1.5 * 1024 * 1024 * 1024)).toBe("1.5 GB");
});
