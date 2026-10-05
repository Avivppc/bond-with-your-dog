import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { RESERVED_SLUGS, slugify, slugProblem } from "./slugs";

const APP = join(__dirname, "..", "..", "app");

/** First-level route names, looking inside (groups) since they don't add to the address. */
function routeNames(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (!e.isDirectory() || e.name.startsWith("[") || e.name.startsWith("_")) return [];
    if (e.name.startsWith("(")) return routeNames(join(dir, e.name));
    return [e.name];
  });
}

describe("reserved page addresses", () => {
  test("cover every route the app has", () => {
    const missing = routeNames(APP).filter((name) => !RESERVED_SLUGS.has(name));
    expect(missing).toEqual([]);
  });
});

describe("slugify", () => {
  test("turns a title into an address", () => {
    expect(slugify("My Workshop 2027!")).toBe("my-workshop-2027");
    expect(slugify("  Café & Dogs ")).toBe("cafe-dogs");
  });
});

describe("slugProblem", () => {
  test("accepts a free address and explains the rest", () => {
    expect(slugProblem("workshop-2027")).toBeNull();
    expect(slugProblem("")).toMatch(/Add/);
    expect(slugProblem("Bad Slug")).toMatch(/lowercase/);
    expect(slugProblem("admin")).toMatch(/already a page/);
    expect(slugProblem("home")).toMatch(/already a page/);
  });
});
