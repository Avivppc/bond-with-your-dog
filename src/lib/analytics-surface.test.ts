import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { APP_ROUTE_SEGMENTS, surfaceForPath } from "./analytics-surface";

const APP_DIR = join(__dirname, "..", "app");

function routeFolders(group: string): string[] {
  return readdirSync(join(APP_DIR, group), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_") && !entry.name.startsWith("("))
    .map((entry) => entry.name);
}

describe("surfaceForPath", () => {
  test("member screens are the app", () => {
    expect(surfaceForPath("/home")).toBe("app");
    expect(surfaceForPath("/learn/abc/def")).toBe("app");
    expect(surfaceForPath("/practice")).toBe("app");
    expect(surfaceForPath("/welcome")).toBe("app");
  });

  test("staff pages are the admin", () => {
    expect(surfaceForPath("/admin")).toBe("admin");
    expect(surfaceForPath("/admin/courses/1")).toBe("admin");
  });

  test("marketing pages are the site", () => {
    expect(surfaceForPath("/")).toBe("site");
    expect(surfaceForPath("/quiz")).toBe("site");
    expect(surfaceForPath("/chapter/foundations")).toBe("site");
    expect(surfaceForPath("/courses")).toBe("site");
  });

  test("login is the app's front door, the rest of the account journey belongs to the site funnel", () => {
    expect(surfaceForPath("/login")).toBe("app");
    expect(surfaceForPath("/signup")).toBe("site");
    expect(surfaceForPath("/forgot-password")).toBe("site");
    expect(surfaceForPath("/reset-password")).toBe("site");
    expect(surfaceForPath("/checkout/foundations")).toBe("site");
  });

  test("a path that only starts like an app route stays on the site", () => {
    expect(surfaceForPath("/homepage-promo")).toBe("site");
  });

  test("every member-app route folder is listed, so new screens are never counted as the site", () => {
    const folders = [...routeFolders("(member)"), ...routeFolders("(onboarding)")];

    expect([...APP_ROUTE_SEGMENTS].sort()).toEqual([...new Set(folders)].sort());
  });
});
