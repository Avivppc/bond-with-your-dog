import { requireStaff, getAdminEmails } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { inviteStaff, removeStaffMember, revokeInvite } from "./actions";

export const dynamic = "force-dynamic";

interface MemberView {
  userId: string;
  email: string;
  role: string;
}

async function loadMembers(): Promise<MemberView[]> {
  const sb = createServiceClient();
  const { data: rows, error } = await sb.from("staff_members").select("user_id, role").order("created_at");
  if (error) {
    console.error("[team] load members failed", error.message);
    return [];
  }
  return Promise.all(
    (rows ?? []).map(async (r) => {
      const { data } = await sb.auth.admin.getUserById(r.user_id);
      return { userId: r.user_id, email: data.user?.email ?? "(unknown)", role: r.role };
    })
  );
}

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { user } = await requireStaff("staff");
  const { ok, error } = await searchParams;

  const [members, invitesRes] = await Promise.all([
    loadMembers(),
    createServiceClient()
      .from("staff_invites")
      .select("id, email, role, created_at")
      .is("accepted_at", null)
      .order("created_at"),
  ]);
  const invites = invitesRes.data ?? [];

  return (
    <div className="space-y-8 max-w-3xl">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tighter">Team</h1>
        <p className="text-sm text-slate-500 mt-1">
          Editors can manage courses, lessons and media. Owners can also manage the team and settings.
        </p>
      </header>

      {ok && <p role="status" className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-sm">{ok}</p>}
      {error && <p role="alert" className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</p>}

      <section className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="font-extrabold mb-4">Invite someone</h2>
        <form action={inviteStaff} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 flex-1 min-w-56">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Email</span>
            <input name="email" type="email" required className="px-4 py-2.5 rounded-lg border border-slate-200" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Role</span>
            <select name="role" defaultValue="editor" className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white">
              <option value="editor">Content editor</option>
              <option value="owner">Owner</option>
            </select>
          </label>
          <button type="submit" className="bg-orange-700 text-white px-5 py-2.5 rounded-full font-bold text-sm">
            Send invite
          </button>
        </form>
        <p className="text-xs text-slate-500 mt-3">
          They sign in (or sign up) with this email at /login. Access is granted once their email is verified.
        </p>
      </section>

      <section className="bg-white rounded-xl p-6 shadow-sm">
        <h2 className="font-extrabold mb-4">Members</h2>
        <ul className="divide-y divide-slate-100 text-sm">
          {getAdminEmails().map((email) => (
            <li key={email} className="py-3 flex items-center justify-between">
              <span className="font-semibold">{email}</span>
              <span className="text-xs font-bold uppercase text-slate-500">owner · bootstrap</span>
            </li>
          ))}
          {members.map((m) => (
            <li key={m.userId} className="py-3 flex items-center justify-between gap-4">
              <span className="font-semibold truncate">{m.email}</span>
              <span className="flex items-center gap-4">
                <span className="text-xs font-bold uppercase text-slate-500">{m.role}</span>
                {m.userId !== user.id && (
                  <form action={removeStaffMember}>
                    <input type="hidden" name="user_id" value={m.userId} />
                    <button type="submit" className="text-xs text-red-600 hover:text-red-800">Remove</button>
                  </form>
                )}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {invites.length > 0 && (
        <section className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="font-extrabold mb-4">Pending invites</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {invites.map((inv) => (
              <li key={inv.id} className="py-3 flex items-center justify-between gap-4">
                <span className="font-semibold truncate">{inv.email}</span>
                <span className="flex items-center gap-4">
                  <span className="text-xs font-bold uppercase text-slate-500">{inv.role}</span>
                  <form action={revokeInvite}>
                    <input type="hidden" name="id" value={inv.id} />
                    <button type="submit" className="text-xs text-red-600 hover:text-red-800">Revoke</button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
