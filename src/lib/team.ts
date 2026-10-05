/**
 * Who has access to the admin ("Users & access"): owners set in Vercel (ADMIN_EMAILS), team
 * members (staff_members) and pending invites, merged into one list. Pure, so the rules are tested.
 */
import type { StaffRole } from "./staff";

/** "signed-up": invited, but they made an account without opening the invite, so their inbox is unproven. */
export type TeamStatus = "bootstrap" | "active" | "invited" | "signed-up";

export interface TeamMember {
  userId: string;
  email: string;
  role: StaffRole;
  name: string | null;
  lastSignInAt: string | null;
  addedAt: string;
}

export interface TeamInvite {
  id: string;
  email: string;
  role: StaffRole;
  createdAt: string;
  /** The account already registered with this email, if any (an unopened invite creates one too). */
  account?: { lastSignInAt: string | null } | null;
}

export interface TeamRow {
  key: string;
  email: string;
  name: string | null;
  role: StaffRole;
  status: TeamStatus;
  userId: string | null;
  inviteId: string | null;
  lastSignInAt: string | null;
  addedAt: string | null;
}

const normalize = (email: string) => email.trim().toLowerCase();

export function buildTeamRows(input: { bootstrapEmails: readonly string[]; members: readonly TeamMember[]; invites: readonly TeamInvite[] }): TeamRow[] {
  const bootstrap = new Set(input.bootstrapEmails.map(normalize));
  const memberByEmail = new Map(input.members.map((m) => [normalize(m.email), m]));

  const owners: TeamRow[] = [...bootstrap].map((email) => {
    const m = memberByEmail.get(email);
    return { key: `boot:${email}`, email, name: m?.name ?? null, role: "owner", status: "bootstrap", userId: m?.userId ?? null, inviteId: null, lastSignInAt: m?.lastSignInAt ?? null, addedAt: m?.addedAt ?? null };
  });
  const members: TeamRow[] = input.members
    .filter((m) => !bootstrap.has(normalize(m.email)))
    .map((m) => ({ key: `user:${m.userId}`, email: normalize(m.email), name: m.name, role: m.role, status: "active", userId: m.userId, inviteId: null, lastSignInAt: m.lastSignInAt, addedAt: m.addedAt }));
  const taken = new Set([...bootstrap, ...memberByEmail.keys()]);
  const invites: TeamRow[] = input.invites
    .filter((i) => !taken.has(normalize(i.email)))
    .map((i) => {
      const lastSignInAt = i.account?.lastSignInAt ?? null;
      const status: TeamStatus = lastSignInAt ? "signed-up" : "invited";
      return { key: `invite:${i.id}`, email: normalize(i.email), name: null, role: i.role, status, userId: null, inviteId: i.id, lastSignInAt, addedAt: i.createdAt };
    });
  return [...owners, ...members, ...invites];
}

/** Why a role change isn't allowed, or null when it is. `to: "none"` removes the person from the team. */
export function roleChangeError(change: { actorId: string; targetId: string; from: StaffRole; to: StaffRole | "none"; owners: number }): string | null {
  if (change.from === change.to) return null;
  if (change.actorId === change.targetId) return "You can't change your own access. Ask another owner.";
  if (change.from === "owner" && change.owners <= 1) return "Keep at least one owner on the team.";
  return null;
}
