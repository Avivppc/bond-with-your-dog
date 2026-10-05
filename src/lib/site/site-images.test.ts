import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { SITE_IMAGE_GROUPS } from "./site-images";

const PUBLIC = join(__dirname, "..", "..", "..", "public");
const listed = SITE_IMAGE_GROUPS.flatMap((g) => g.images.map((i) => i.src));

describe("the editor's site image library", () => {
  test("every listed image exists", () => {
    expect(listed.filter((src) => !existsSync(join(PUBLIC, src)))).toEqual([]);
  });

  test("lists every site photo and sketch", () => {
    const files = [
      ...readdirSync(join(PUBLIC, "images", "photos")).map((f) => `/images/photos/${f}`),
      ...readdirSync(join(PUBLIC, "sketches")).map((f) => `/sketches/${f}`),
    ].filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
    expect(files.filter((f) => !listed.includes(f))).toEqual([]);
  });
});
