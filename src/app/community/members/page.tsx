import Link from "next/link";
import { communityContext } from "@/lib/community/context";
import { loadMembers } from "@/lib/community/queries";
import { Avatar, CARD, FIELD } from "@/components/community/bits";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 48;

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const ctx = await communityContext();
  if (!ctx.viewer.canAccess) return null;
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const { members, total } = await loadMembers(ctx.supabase, q?.trim().slice(0, 80) ?? "", PAGE_SIZE, (page - 1) * PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="text-sm text-[#6c6a69]">{total} members</p>
        </div>
        <form className="w-full max-w-xs">
          <input name="q" defaultValue={q ?? ""} placeholder="Search by name or dog" aria-label="Search members" className={FIELD} />
        </form>
      </header>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <li key={m.user_id}>
            <Link href={`/community/members/${m.user_id}`} className={`${CARD} flex items-center gap-3 p-4 hover:shadow-sm`}>
              <Avatar author={{ id: m.user_id, name: m.full_name ?? "Member", avatarUrl: m.avatar_url }} size={44} />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{m.full_name ?? "Member"}</span>
                <span className="block truncate text-xs text-[#6c6a69]">
                  {m.dog_name ? `with ${m.dog_name} · ` : ""}
                  {Number(m.points)} pts
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {pages > 1 && (
        <nav className="flex items-center gap-3 text-sm" aria-label="Pages">
          {page > 1 && <Link href={`/community/members?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page - 1) })}`}>← Previous</Link>}
          <span className="text-[#6c6a69]">
            Page {page} of {pages}
          </span>
          {page < pages && <Link href={`/community/members?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page + 1) })}`}>Next →</Link>}
        </nav>
      )}
    </div>
  );
}
