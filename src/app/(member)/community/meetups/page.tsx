import Link from "next/link";
import { communityContext } from "@/lib/community/context";
import { LocalTime } from "@/components/ui/LocalTime";
import { CARD } from "@/components/community/bits";

export const dynamic = "force-dynamic";

export default async function MeetupsPage({ searchParams }: { searchParams: Promise<{ past?: string }> }) {
  const ctx = await communityContext();
  if (!ctx.viewer.canAccess) return null;
  const past = (await searchParams).past === "1";
  const now = new Date().toISOString();
  let query = ctx.supabase.from("community_meetups").select("id, title, starts_at, duration_minutes, location, canceled, published");
  query = past ? query.lt("starts_at", now).order("starts_at", { ascending: false }) : query.gte("starts_at", now).order("starts_at");
  const [meetupsRes, rsvpsRes] = await Promise.all([query.limit(50), ctx.supabase.from("community_rsvps").select("meetup_id, user_id")]);
  const rsvps = (rsvpsRes.data ?? []) as { meetup_id: string; user_id: string }[];
  const meetups = meetupsRes.data ?? [];

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Meetups</h1>
          <p className="text-sm text-[#6c6a69]">Live sessions with the coaches and the community.</p>
        </div>
        <nav className="inline-flex rounded-full border border-[#e7e6e4] bg-white p-1 text-sm">
          <Link href="/community/meetups" className={`rounded-full px-3 py-1 font-medium ${!past ? "bg-[#1a1a19] text-white" : "text-[#6c6a69]"}`}>
            Upcoming
          </Link>
          <Link href="/community/meetups?past=1" className={`rounded-full px-3 py-1 font-medium ${past ? "bg-[#1a1a19] text-white" : "text-[#6c6a69]"}`}>
            Past
          </Link>
        </nav>
      </header>
      {meetups.length === 0 ? (
        <div className={`${CARD} p-10 text-center text-sm text-[#6c6a69]`}>{past ? "No past meetups." : "No upcoming meetups — check back soon."}</div>
      ) : (
        <ul className="space-y-3">
          {meetups.map((m) => {
            const going = rsvps.filter((r) => r.meetup_id === m.id);
            return (
              <li key={m.id}>
                <Link href={`/community/meetups/${m.id}`} className={`${CARD} flex items-center gap-4 p-4 hover:shadow-sm`}>
                  <span className="flex w-14 shrink-0 flex-col items-center rounded-[10px] bg-[#e3f5f5] py-1.5 text-[#0e666a]">
                    <span className="text-[11px] font-bold uppercase">
                      <LocalTime iso={m.starts_at} format="month" />
                    </span>
                    <span className="text-xl font-bold leading-none">
                      <LocalTime iso={m.starts_at} format="day" />
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">
                      {m.title}
                      {m.canceled && <span className="ms-2 rounded-full bg-[#fde8e8] px-2 text-xs text-[#a4262c]">Canceled</span>}
                    </span>
                    <span className="block text-xs text-[#6c6a69]">
                      <LocalTime iso={m.starts_at} format="weekdayTime" zoneLabel /> · {m.duration_minutes} min
                      {m.location ? ` · ${m.location}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-[#6c6a69]">
                    {going.length} going{going.some((r) => r.user_id === ctx.viewer.userId) ? " · incl. you" : ""}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
