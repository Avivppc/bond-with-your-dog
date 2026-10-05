import { describe, expect, it } from "vitest";
import { EMAIL_IMAGE_MAX_BYTES, emailImagePath, sniffImageType, validateEmailImage } from "./upload-rules";

const bytes = (...values: number[]) => new Uint8Array(values);
const ascii = (text: string) => Array.from(text, (c) => c.charCodeAt(0));

describe("validateEmailImage", () => {
  it("accepts supported images up to 2 MB", () => {
    expect(validateEmailImage({ type: "image/png", size: 1000 })).toBeNull();
    expect(validateEmailImage({ type: "image/webp", size: EMAIL_IMAGE_MAX_BYTES })).toBeNull();
  });

  it("rejects other types, empty and oversized files", () => {
    expect(validateEmailImage({ type: "image/svg+xml", size: 10 })).toMatch(/PNG, JPG, GIF or WebP/);
    expect(validateEmailImage({ type: "text/html", size: 10 })).not.toBeNull();
    expect(validateEmailImage({ type: "image/png", size: 0 })).toMatch(/empty/);
    expect(validateEmailImage({ type: "image/jpeg", size: EMAIL_IMAGE_MAX_BYTES + 1 })).toMatch(/2 MB/);
  });
});

describe("sniffImageType", () => {
  it("recognises the four formats by their magic bytes", () => {
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe("image/png");
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
    expect(sniffImageType(bytes(...ascii("GIF89a"), 1))).toBe("image/gif");
    expect(sniffImageType(bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP")))).toBe("image/webp");
  });

  it("returns null for anything else", () => {
    expect(sniffImageType(bytes(...ascii("<html><script>")))).toBeNull();
    expect(sniffImageType(bytes())).toBeNull();
  });
});

describe("emailImagePath", () => {
  it("files images by year with the type's extension", () => {
    expect(emailImagePath(new Date("2026-10-03T12:00:00Z"), "abc-123", "image/jpeg")).toBe("2026/abc-123.jpg");
  });
});
