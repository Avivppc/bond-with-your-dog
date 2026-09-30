import Link from "next/link";
import { communityContext } from "@/lib/community/context";
import { loadLeaderboard } from "@/lib/community/queries";
import { Avatar, CARD } from "@/components/community/bits";

export const dynamic = "force-dynamic";

const PERIODS = [
  { key: "week", label: "This week", days: 7 },
  { key: "month", label: "This month", days: 30 },
  { key: "all", label: "All time", days: null },
] as const;

const HOW_TO_EARN = [
  ["Complete a challenge", "challenge points"],
  ["RSVP to a meetup", "25"],
  ["Comment on a challenge post", "3 (up to 5 a day)"],
  ["Post, comment, vote or like", "1 (up to 5 a day each)"],
  ["Someone likes your post", "1"],
] as const;

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const ctx = await communityContext();
  if (!ctx.viewer.canAccess) return null;
  const key = (await searchParams).period;
  const period = PERIODS.find((p) => p.key === key) ?? PERIODS[1];
  const since = period.days ? new Date(new Date().getTime() - period.days * 86_400_000) : null;
  const rows = await loadLeaderboard(ctx.supabase, since, 50);
  const myRank = rows.findIndex((r) => r.user_id === ctx.viewer.userId);

  return (
    <div className="flex flex-col gap-6 xl:flex-row">
      <div className="min-w-0 flex-1 space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Leaderboard</h1>
            <p className="text-sm text-[#6c6a69]">{myRank >= 0 ? `You're #${myRank + 1} — keep going!` : "Take part to earn points and climb the board."}</p>
          </div>
          <nav className="inline-flex rounded-full border border-[#e7e6e4] bg-white p-1 text-sm">
            {PERIODS.map((p) => (
              <Link key={p.key} href={`/community/leaderboard?period=${p.key}`} className={`rounded-full px-3 py-1 font-medium ${p.key === period.key ? "bg-[#1a1a19] text-white" : "text-[#6c6a69]"}`}>
                {p.label}
              </Link>
            ))}
          </nav>
        </header>
        {rows.length === 0 ? (
          <div className={`${CARD} p-10 text-center text-sm text-[#6c6a69]`}>No points yet in this period.</div>
        ) : (
          <ol className={`${CARD} divide-y divide-[#f0efee] overflow-hidden`}>
            {rows.map((r, i) => (
              <li key={r.user_id} className={`flex items-center gap-3 px-4 py-3 ${r.user_id === ctx.viewer.userId ? "bg-[#e3f5f5]" : ""}`}>
                <span className={`w-8 text-center font-bold ${i < 3 ? "text-[#ff8f00]" : "text-[#9b9997]"}`}>{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
                <Avatar author={{ id: r.user_id, name: r.full_name ?? "Member", avatarUrl: r.avatar_url }} size={34} />
                <Link href={`/community/members/${r.user_id}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">
                  {r.full_name ?? "Member"}
                  {r.dog_name && <span className="font-normal text-[#6c6a69]"> & {r.dog_name}</span>}
                </Link>
                <span className="font-bold tabular-nums">{r.points.toLocaleString()} pts</span>
              </li>
            ))}
          </ol>
        )}
      </div>
      <aside className={`${CARD} h-fit p-5 xl:w-72`}>
        <h2 className="font-semibold">How to earn points</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {HOW_TO_EARN.map(([what, points]) => (
            <li key={what} className="flex justify-between gap-3">
              <span className="text-[#6c6a69]">{what}</span>
              <span className="shrink-0 font-semibold">{points}</span>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
