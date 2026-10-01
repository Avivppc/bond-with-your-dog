import Link from "next/link";
import { requireStaff, getAdminEmails } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { buildTeamRows, type TeamInvite, type TeamMember, type TeamRow } from "@/lib/team";
import type { StaffRole } from "@/lib/staff";
import { Card, Notice, PageHeader, StatusPill, TABLE, TD, TH, THEAD, TROW } from "../_components/ui";
import { Avatar, MENU_ITEM, OptionsMenu, shortDate } from "../_components/list-kit";
import { changeStaffRole, removeStaffMember, resendInvite, revokeInvite } from "./actions";
import { InviteForm } from "./InviteForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Users & access" };

const ROLE_LABEL: Record<StaffRole, string> = { owner: "Owner", editor: "Content editor" };

const ROLE_HELP: { role: StaffRole; can: string }[] = [
  { role: "owner", can: "Everything: courses and lessons, sales and contacts, Roni's Studio, analytics, and who has access to the admin." },
  { role: "editor", can: "Courses, lessons, moves, community, coaching and Roni's Studio, offers, contacts and orders. Can't manage admin access." },
];

type Service = ReturnType<typeof createServiceClient>;

async function loadMembers(sb: Service): Promise<TeamMember[]> {
  const { data: rows, error } = await sb.from("staff_members").select("user_id, role, created_at").order("created_at");
  if (error) {
    console.error("[team] load members failed", error.message);
    return [];
  }
  const ids = (rows ?? []).map((r) => r.user_id as string);
  const { data: profiles } = ids.length ? await sb.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
  const names = new Map((profiles ?? []).map((p) => [p.id as string, ((p.full_name as string | null) ?? "").trim() || null]));
  return Promise.all(
    (rows ?? []).map(async (r): Promise<TeamMember> => {
      const { data, error: userError } = await sb.auth.admin.getUserById(r.user_id as string);
      if (userError) console.error("[team] user lookup failed", { userId: r.user_id, error: userError.message });
      return {
        userId: r.user_id as string,
        email: data.user?.email ?? "(unknown)",
        role: r.role as StaffRole,
        name: names.get(r.user_id as string) ?? null,
        lastSignInAt: data.user?.last_sign_in_at ?? null,
        addedAt: r.created_at as string,
      };
    }),
  );
}

async function loadInvites(sb: Service): Promise<TeamInvite[]> {
  const { data, error } = await sb.from("staff_invites").select("id, email, role, created_at").is("accepted_at", null).order("created_at");
  if (error) console.error("[team] load invites failed", error.message);
  return (data ?? []).map((i) => ({ id: i.id as string, email: i.email as string, role: i.role as StaffRole, createdAt: i.created_at as string }));
}

function StatusCell({ row }: { row: TeamRow }) {
  if (row.status === "invited") return <StatusPill tone="warning">Invited</StatusPill>;
  if (row.status === "bootstrap") return <StatusPill tone="info">Owner in Vercel</StatusPill>;
  return <StatusPill tone="published">Active</StatusPill>;
}

function RowActions({ row, isMe }: { row: TeamRow; isMe: boolean }) {
  if (row.status === "invited" && row.inviteId) {
    return (
      <OptionsMenu label={`Options for ${row.email}`}>
        <form action={resendInvite}>
          <input type="hidden" name="id" value={row.inviteId} />
          <button type="submit" className={MENU_ITEM}>Resend invite</button>
        </form>
        <form action={revokeInvite}>
          <input type="hidden" name="id" value={row.inviteId} />
          <button type="submit" className={`${MENU_ITEM} text-red-700`}>Revoke invite</button>
        </form>
      </OptionsMenu>
    );
  }
  if (row.status === "bootstrap" || !row.userId || isMe) return null;
  const other: StaffRole = row.role === "owner" ? "editor" : "owner";
  return (
    <OptionsMenu label={`Options for ${row.email}`}>
      <Link href={`/admin/people/${row.userId}`} className={MENU_ITEM}>View contact</Link>
      <form action={changeStaffRole}>
        <input type="hidden" name="user_id" value={row.userId} />
        <input type="hidden" name="role" value={other} />
        <button type="submit" className={MENU_ITEM}>Make {ROLE_LABEL[other].toLowerCase()}</button>
      </form>
      <form action={removeStaffMember}>
        <input type="hidden" name="user_id" value={row.userId} />
        <button type="submit" className={`${MENU_ITEM} text-red-700`}>Remove access</button>
      </form>
    </OptionsMenu>
  );
}

/** Settings → Users & access: who can sign in to this admin, with which role. */
export default async function TeamPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const { user } = await requireStaff("staff");
  const { ok, error } = await searchParams;
  const sb = createServiceClient();
  const [members, invites] = await Promise.all([loadMembers(sb), loadInvites(sb)]);
  const rows = buildTeamRows({ bootstrapEmails: getAdminEmails(), members, invites });

  return (
    <div className="space-y-6">
      <PageHeader title="Users & access" description="Everyone who can sign in to this admin, and what they can do." />
      {ok && <Notice tone="success">{ok}</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      <Card title="Invite a user" description="They get a one-time link to choose a password, then land in the admin with the role you pick.">
        <InviteForm />
      </Card>

      <Card title={`Users (${rows.length})`} flush>
        <div className="relative overflow-x-auto">
          <table className={TABLE}>
            <thead className={THEAD}>
              <tr>
                <th className={TH}>Name</th>
                <th className={TH}>Role</th>
                <th className={TH}>Status</th>
                <th className={TH}>Last sign-in</th>
                <th className={TH}>Added</th>
                <th className={TH}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isMe = row.userId === user.id;
                return (
                  <tr key={row.key} className={TROW}>
                    <td className={TD}>
                      <span className="flex items-center gap-3">
                        <Avatar name={row.name ?? row.email} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            {row.name ?? row.email}
                            {isMe && <span className="ml-2 text-xs font-normal text-[#6c6a69]">(you)</span>}
                          </span>
                          {row.name && <span className="block truncate text-xs text-[#6c6a69]">{row.email}</span>}
                        </span>
                      </span>
                    </td>
                    <td className={`${TD} whitespace-nowrap`}>{ROLE_LABEL[row.role]}</td>
                    <td className={TD}>
                      <StatusCell row={row} />
                    </td>
                    <td className={`${TD} whitespace-nowrap text-[#6c6a69]`}>
                      {row.status === "invited" ? "—" : row.lastSignInAt ? shortDate(row.lastSignInAt) : "Never signed in"}
                    </td>
                    <td className={`${TD} whitespace-nowrap text-[#6c6a69]`}>{shortDate(row.addedAt)}</td>
                    <td className={`${TD} text-right`}>
                      <RowActions row={row} isMe={isMe} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Roles">
        <dl className="space-y-3 text-sm">
          {ROLE_HELP.map((r) => (
            <div key={r.role}>
              <dt className="font-medium">{ROLE_LABEL[r.role]}</dt>
              <dd className="text-[#6c6a69]">{r.can}</dd>
            </div>
          ))}
          <div>
            <dt className="font-medium">Owner in Vercel</dt>
            <dd className="text-[#6c6a69]">Set in the ADMIN_EMAILS setting on Vercel, so the account can never be locked out. Change it there, not here.</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
