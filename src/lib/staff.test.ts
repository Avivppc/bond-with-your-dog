import { describe, expect, it } from "vitest";
import { canPerform, resolveStaffRole } from "./staff";

describe("resolveStaffRole", () => {
  const bootstrapOwners = ["founder@bonded.dev"];

  it("treats bootstrap emails (ADMIN_EMAILS) as owners even without a DB row", () => {
    expect(resolveStaffRole("Founder@Bonded.dev", null, bootstrapOwners, true)).toBe("owner");
  });

  it("uses the database role for invited staff", () => {
    expect(resolveStaffRole("client@studio.dev", "editor", bootstrapOwners, true)).toBe("editor");
    expect(resolveStaffRole("partner@studio.dev", "owner", bootstrapOwners, true)).toBe("owner");
  });

  it("upgrades a bootstrap email to owner even if the DB says editor", () => {
    expect(resolveStaffRole("founder@bonded.dev", "editor", bootstrapOwners, true)).toBe("owner");
  });

  it("ignores the bootstrap list for an unverified email (someone signing up with the owner's address)", () => {
    expect(resolveStaffRole("founder@bonded.dev", null, bootstrapOwners, false)).toBeNull();
  });

  it("returns null for students and unknown roles", () => {
    expect(resolveStaffRole("student@test.dev", null, bootstrapOwners, true)).toBeNull();
    expect(resolveStaffRole("student@test.dev", "superuser", bootstrapOwners, true)).toBeNull();
    expect(resolveStaffRole(undefined, null, bootstrapOwners, true)).toBeNull();
  });
});

describe("canPerform", () => {
  it("lets editors (the client's team) run content and sales, but not staff or settings", () => {
    expect(canPerform("editor", "content")).toBe(true);
    expect(canPerform("editor", "sales")).toBe(true);
    expect(canPerform("editor", "staff")).toBe(false);
    expect(canPerform("editor", "settings")).toBe(false);
  });

  it("lets owners do everything", () => {
    expect(canPerform("owner", "content")).toBe(true);
    expect(canPerform("owner", "sales")).toBe(true);
    expect(canPerform("owner", "staff")).toBe(true);
    expect(canPerform("owner", "settings")).toBe(true);
  });
});
