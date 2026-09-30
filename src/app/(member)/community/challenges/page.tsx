import Link from "next/link";
import { communityContext } from "@/lib/community/context";
import { LocalTime } from "@/components/ui/LocalTime";
import { CARD } from "@/components/community/bits";

export const dynamic = "force-dynamic";

function DateRange({ start, end }: { start: string; end: string }) {
  return (
    <>
      <LocalTime iso={start} format="shortDate" /> – <LocalTime iso={end} format="shortDate" />
    </>
  );
}

export default async function ChallengesPage() {
  const ctx = await communityContext();
  if (!ctx.viewer.canAccess) return null;
  const [challengesRes, participantsRes] = await Promise.all([
    ctx.supabase.from("community_challenges").select("id, title, description, cover_image_url, starts_at, ends_at, points, published").order("starts_at", { ascending: false }),
    ctx.supabase.from("community_challenge_participants").select("challenge_id, user_id, completed_at"),
  ]);
  const participants = (participantsRes.data ?? []) as { challenge_id: string; user_id: string; completed_at: string | null }[];
  const now = new Date().getTime();
  const challenges = challengesRes.data ?? [];

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Challenges</h1>
        <p className="text-sm text-[#6c6a69]">Take on a challenge, check off each step and earn points.</p>
      </header>
      {challenges.length === 0 ? (
        <div className={`${CARD} p-10 text-center text-sm text-[#6c6a69]`}>No challenges yet — the team will post one soon.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {challenges.map((c) => {
            const joined = participants.filter((p) => p.challenge_id === c.id);
            const mine = joined.find((p) => p.user_id === ctx.viewer.userId);
            const state = now < new Date(c.starts_at).getTime() ? "Starts soon" : now > new Date(c.ends_at).getTime() ? "Ended" : "Live";
            return (
              <Link key={c.id} href={`/community/challenges/${c.id}`} className={`${CARD} block overflow-hidden hover:shadow-sm`}>
                {c.cover_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- challenge cover set by the team
                  <img src={c.cover_image_url} alt="" className="h-32 w-full object-cover" />
                ) : (
                  <div className="flex h-32 items-center justify-center bg-gradient-to-r from-[#ff8f00] to-[#f2b25b]" aria-hidden>
                    <span className="material-symbols-outlined text-5xl text-white">emoji_events</span>
                  </div>
                )}
                <div className="space-y-1 p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold">
                    <span className={state === "Live" ? "text-[#1c6b35]" : "text-[#6c6a69]"}>{state}</span>
                    {!c.published && <span className="rounded-full bg-[#f0efee] px-2 text-[#4b4a48]">Draft</span>}
                  </p>
                  <h2 className="font-bold">{c.title}</h2>
                  <p className="text-xs text-[#6c6a69]">
                    <DateRange start={c.starts_at} end={c.ends_at} /> · {c.points} points · {joined.length} joined
                  </p>
                  {mine && <p className="text-xs font-semibold text-[#0e666a]">{mine.completed_at ? "✓ Completed" : "You're in"}</p>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
