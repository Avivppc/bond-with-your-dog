import { describe, expect, it } from "vitest";
import { adminNavFor, isGroupActive, isNavItemActive } from "./admin-nav";

const hrefsOf = (role: "owner" | "editor") => {
  const nav = adminNavFor(role);
  return [...nav.main, ...nav.bottom].flatMap((e) => (e.children ? e.children.map((c) => c.href) : [e.href]));
};

describe("adminNavFor", () => {
  it("lays out Kajabi's top-level entries with expandable groups", () => {
    const nav = adminNavFor("owner");
    expect(nav.main.map((e) => e.label)).toEqual(["Dashboard", "Products", "Website", "Sales", "Marketing", "Coaching", "Contacts", "Analytics"]);
    expect(nav.main.find((e) => e.label === "Website")?.children?.map((c) => c.href)).toEqual(["/admin/website", "/site-editor/theme"]);
    expect(nav.main.find((e) => e.label === "Marketing")?.children?.map((c) => c.href)).toEqual(["/admin/email-flows", "/admin/campaigns", "/admin/discount-codes"]);
    expect(nav.main[0]).toEqual({ label: "Dashboard", icon: "home", href: "/admin" });
    expect(nav.main.find((e) => e.label === "Products")?.children?.map((c) => c.label)).toEqual([
      "All Products",
      "Courses",
      "Moves Library",
      "Assessments",
      "Community",
    ]);
    expect(nav.main.find((e) => e.label === "Contacts")?.children?.map((c) => c.href)).toEqual(["/admin/people", "/admin/insights", "/admin/leads", "/admin/inbox"]);
    expect(nav.bottom.map((e) => e.label)).toEqual(["Settings", "View member app"]);
  });

  it("links the coaching tools, including Roni's Studio outside the admin", () => {
    expect(hrefsOf("owner")).toEqual(expect.arrayContaining(["/studio", "/admin/coaching/questions", "/admin/coaching/live-qa", "/home"]));
  });

  it("hides Team, General and Payments from editors but keeps the settings they send with", () => {
    const nav = adminNavFor("editor");
    expect(hrefsOf("editor")).not.toContain("/admin/team");
    expect(nav.bottom.find((e) => e.label === "Settings")?.children?.map((c) => c.href)).toEqual(["/admin/settings/notifications", "/admin/settings/email"]);
    expect([...nav.main, ...nav.bottom].every((e) => (e.children ? e.children.length > 0 : Boolean(e.href)))).toBe(true);
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

describe("isGroupActive", () => {
  it("opens a group when one of its pages is showing", () => {
    const contacts = adminNavFor("owner").main.find((e) => e.label === "Contacts");
    expect(contacts && isGroupActive(contacts, "/admin/people/123")).toBe(true);
    expect(contacts && isGroupActive(contacts, "/admin/offers")).toBe(false);
  });
});
