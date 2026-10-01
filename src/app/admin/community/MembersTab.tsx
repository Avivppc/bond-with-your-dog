import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BTN_SECONDARY, Card, EmptyState, INPUT, TABLE, TD, TH, THEAD, TROW } from "@/app/admin/_components/ui";
import { Avatar, Pagination, shortDate } from "@/app/admin/_components/list-kit";
import { loadMembers } from "@/app/admin/coaching/members";

/** Community → Members: everyone who can use the community now (active students, community offers, the team). */
export const MEMBERS_PER_PAGE = 50;

interface MemberRow {
  user_id: string;
  full_name: string | null;
  dog_name: string | null;
  avatar_url: string | null;
  points: number;
  joined_at: string;
  total_count: number;
}

async function loadCommunityMembers(search: string, page: number): Promise<{ rows: MemberRow[]; total: number }> {
  // As the signed-in staff member: the RPC only answers people who can open the community.
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("community_members", { p_search: search, p_limit: MEMBERS_PER_PAGE, p_offset: (page - 1) * MEMBERS_PER_PAGE });
  if (error) console.error("[admin/community] members load failed", error.message);
  const rows = (data ?? []) as MemberRow[];
  return { rows, total: Number(rows[0]?.total_count ?? 0) };
}

export async function MembersTab({ search, page }: { search: string; page: number }) {
  const { rows, total } = await loadCommunityMembers(search, page);
  const emails = await loadMembers(rows.map((r) => r.user_id));
  const pages = Math.max(1, Math.ceil(total / MEMBERS_PER_PAGE));
  const hrefFor = (p: number) => `/admin/community?${new URLSearchParams({ tab: "members", ...(search ? { q: search } : {}), page: String(p) })}`;

  return (
    <Card flush title={`Members (${total})`} description="Students with an active course (when the community is open to students), buyers of offers that include it, and your team.">
      <form className="flex flex-wrap items-center gap-2 px-5" role="search">
        <input type="hidden" name="tab" value="members" />
        <input name="q" defaultValue={search} placeholder="Search by name or dog" aria-label="Search members" className={`${INPUT} max-w-xs`} />
        <button type="submit" className={BTN_SECONDARY}>
          Search
        </button>
        {search && (
          <Link href="/admin/community?tab=members" className="text-sm text-[#6c6a69] hover:underline">
            Clear
          </Link>
        )}
      </form>
      {rows.length === 0 ? (
        <EmptyState title={search ? "No members match your search." : "No members yet."} />
      ) : (
        <div className="relative mt-4 overflow-x-auto">
          <table className={TABLE}>
            <thead className={THEAD}>
              <tr>
                <th className={TH}>Member</th>
                <th className={TH}>Dog</th>
                <th className={`${TH} text-right`}>Points</th>
                <th className={TH}>Member since</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const email = emails.get(m.user_id)?.email ?? null;
                const name = m.full_name?.trim() || email || "Member";
                return (
                  <tr key={m.user_id} className={TROW}>
                    <td className={TD}>
                      <Link href={`/admin/people/${m.user_id}`} className="group flex items-center gap-3">
                        <Avatar name={name} src={m.avatar_url} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium group-hover:underline">{name}</span>
                          {email && email !== name && <span className="block truncate text-xs text-[#6c6a69]">{email}</span>}
                        </span>
                      </Link>
                    </td>
                    <td className={`${TD} text-[#6c6a69]`}>{m.dog_name ?? "—"}</td>
                    <td className={`${TD} text-right tabular-nums`}>{Number(m.points)}</td>
                    <td className={`${TD} whitespace-nowrap text-[#6c6a69]`}>{shortDate(m.joined_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex justify-end px-5 py-3">
        <Pagination page={Math.min(page, pages)} pages={pages} hrefFor={hrefFor} />
      </div>
    </Card>
  );
}
