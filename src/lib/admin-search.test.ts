import { describe, expect, test } from "vitest";
import { adminNavFor } from "./admin-nav";
import { flattenHits, likePattern, navHits, searchTerm } from "./admin-search";

describe("searchTerm", () => {
  test("trims, squeezes spaces and caps the length; too short means no database search", () => {
    expect(searchTerm("  spin   turn ")).toBe("spin turn");
    expect(searchTerm("a")).toBeNull();
    expect(searchTerm("x".repeat(200))).toHaveLength(80);
  });
});

describe("likePattern", () => {
  test("escapes the LIKE wildcards and the PostgREST separators", () => {
    expect(likePattern("50%_off")).toBe("%50\\%\\_off%");
    expect(likePattern("a,b(c)")).toBe("%a b c %");
  });
});

describe("navHits", () => {
  test("finds admin screens by name or group, only those the role may open", () => {
    const owner = navHits(adminNavFor("owner"), "replies");
    expect(owner.map((h) => h.href)).toContain("/admin/coaching/replies");
    expect(navHits(adminNavFor("owner"), "coaching").map((h) => h.label)).toContain("Lesson questions");
    expect(navHits(adminNavFor("editor"), "payments")).toEqual([]);
  });

  test("an empty search lists nothing", () => {
    expect(navHits(adminNavFor("owner"), " ")).toEqual([]);
  });
});

describe("flattenHits", () => {
  test("keeps the group order and numbers every hit for the keyboard", () => {
    const flat = flattenHits([
      { group: "Courses", hits: [{ label: "Moves", href: "/c/1", icon: "school" }] },
      { group: "Screens", hits: [{ label: "Orders", href: "/admin/orders", icon: "sell" }] },
    ]);
    expect(flat.map((h) => [h.group, h.index])).toEqual([
      ["Courses", 0],
      ["Screens", 1],
    ]);
  });
});
