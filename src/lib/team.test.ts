import { describe, expect, it } from "vitest";
import { buildTeamRows, roleChangeError } from "./team";

const member = (userId: string, email: string, role: "owner" | "editor") => ({ userId, email, role, name: null, lastSignInAt: null, addedAt: "2026-10-01T00:00:00Z" });

describe("buildTeamRows", () => {
  it("lists Vercel owners, team members and pending invites once each", () => {
    const rows = buildTeamRows({
      bootstrapEmails: ["aviv@example.com"],
      members: [member("u1", "Aviv@Example.com", "owner"), member("u2", "roni@example.com", "editor")],
      invites: [{ id: "i1", email: "new@example.com", role: "editor", createdAt: "2026-10-01T00:00:00Z" }],
    });
    expect(rows.map((r) => [r.email, r.role, r.status])).toEqual([
      ["aviv@example.com", "owner", "bootstrap"],
      ["roni@example.com", "editor", "active"],
      ["new@example.com", "editor", "invited"],
    ]);
    expect(rows[0].userId).toBe("u1");
  });

  it("shows a Vercel owner who never signed in", () => {
    const rows = buildTeamRows({ bootstrapEmails: ["boss@example.com"], members: [], invites: [] });
    expect(rows).toEqual([expect.objectContaining({ email: "boss@example.com", status: "bootstrap", userId: null })]);
  });

  it("drops an invite for someone already on the team", () => {
    const rows = buildTeamRows({
      bootstrapEmails: [],
      members: [member("u2", "roni@example.com", "editor")],
      invites: [{ id: "i1", email: "roni@example.com", role: "owner", createdAt: "2026-10-01T00:00:00Z" }],
    });
    expect(rows).toHaveLength(1);
  });
});

describe("roleChangeError", () => {
  it("allows promoting and demoting other people", () => {
    expect(roleChangeError({ actorId: "a", targetId: "b", from: "editor", to: "owner", owners: 1 })).toBeNull();
    expect(roleChangeError({ actorId: "a", targetId: "b", from: "owner", to: "editor", owners: 2 })).toBeNull();
  });

  it("never leaves the team without an owner, and nobody demotes themselves", () => {
    expect(roleChangeError({ actorId: "a", targetId: "b", from: "owner", to: "editor", owners: 1 })).toMatch(/at least one owner/);
    expect(roleChangeError({ actorId: "a", targetId: "b", from: "owner", to: "none", owners: 1 })).toMatch(/at least one owner/);
    expect(roleChangeError({ actorId: "a", targetId: "a", from: "owner", to: "editor", owners: 3 })).toMatch(/your own/);
    expect(roleChangeError({ actorId: "a", targetId: "a", from: "owner", to: "none", owners: 3 })).toMatch(/your own/);
  });
});
