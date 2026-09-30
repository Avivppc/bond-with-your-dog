/**
 * Staff roles for the admin/CMS. Pure logic (no Next/Supabase imports) so the
 * mobile app and tests can share it.
 *
 * - owner:  the platform owner — everything, including inviting staff and settings
 * - editor: the client's content team — courses, lessons, media, moderation
 */
export type StaffRole = "owner" | "editor";
export type StaffCapability = "content" | "staff" | "settings";

const STAFF_ROLES: readonly StaffRole[] = ["owner", "editor"];

const CAPABILITIES: Record<StaffRole, readonly StaffCapability[]> = {
  owner: ["content", "staff", "settings"],
  editor: ["content"],
};

function isStaffRole(value: unknown): value is StaffRole {
  return typeof value === "string" && (STAFF_ROLES as readonly string[]).includes(value);
}

/**
 * Bootstrap owners (ADMIN_EMAILS) always resolve to owner so the platform owner
 * can never lock themselves out; everyone else gets their staff_members role.
 */
export function resolveStaffRole(
  email: string | null | undefined,
  dbRole: string | null | undefined,
  bootstrapOwnerEmails: readonly string[]
): StaffRole | null {
  const normalized = email?.trim().toLowerCase();
  if (normalized && bootstrapOwnerEmails.includes(normalized)) return "owner";
  return isStaffRole(dbRole) ? dbRole : null;
}

export function canPerform(role: StaffRole, capability: StaffCapability): boolean {
  return CAPABILITIES[role].includes(capability);
}
