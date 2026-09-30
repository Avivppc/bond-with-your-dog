import { describe, expect, it } from "vitest";
import { adminNavFor, isNavItemActive } from "./admin-nav";

describe("adminNavFor", () => {
  it("gives owners every section, grouped like Kajabi's sidebar", () => {
    const groups = adminNavFor("owner");
    expect(groups.map((g) => g.label)).toEqual([null, "Products", "Sales", "Contacts", "Analytics", "Community", "Settings"]);
    expect(groups.flatMap((g) => g.items.map((i) => i.href))).toContain("/admin/team");
  });

  it("hides sections an editor can't use and drops groups left empty", () => {
    const groups = adminNavFor("editor");
    const hrefs = groups.flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).not.toContain("/admin/team");
    expect(groups.some((g) => g.items.length === 0)).toBe(false);
    expect(groups.map((g) => g.label)).not.toContain("Settings");
  });
});

describe("isNavItemActive", () => {
  it("matches the dashboard only exactly, sections by prefix", () => {
    expect(isNavItemActive("/admin", "/admin")).toBe(true);
    expect(isNavItemActive("/admin", "/admin/courses")).toBe(false);
    expect(isNavItemActive("/admin/courses", "/admin/courses/abc/lessons/1")).toBe(true);
    expect(isNavItemActive("/admin/courses", "/admin/coursesx")).toBe(false);
  });
});
