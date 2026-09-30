import Link from "next/link";
import { notFound } from "next/navigation";
import { communityContext } from "@/lib/community/context";
import { LocalTime } from "@/components/ui/LocalTime";
import { loadFeed } from "@/lib/community/queries";
import { CARD, RichText } from "@/components/community/bits";
import { Composer } from "@/components/community/Composer";
import { PostCard } from "@/components/community/PostCard";
import { JoinChallengeButton, StepList } from "@/components/community/ChallengeControls";

export const dynamic = "force-dynamic";

export default async function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await communityContext();
  if (!ctx.viewer.canAccess) return null;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const { data: challenge } = await ctx.supabase.from("community_challenges").select("*").eq("id", id).maybeSingle();
  if (!challenge) notFound();
  const [stepsRes, participantsRes, completionsRes, posts] = await Promise.all([
    ctx.supabase.from("community_challenge_steps").select("id, title, body, position").eq("challenge_id", id).order("position"),
    ctx.supabase.from("community_challenge_participants").select("user_id, completed_at").eq("challenge_id", id),
    ctx.supabase.from("community_step_completions").select("step_id"),
    loadFeed(ctx.supabase, ctx.channels, ctx.viewer.userId, { challengeId: id }),
  ]);
  const steps = stepsRes.data ?? [];
  const participants = participantsRes.data ?? [];
  const mine = participants.find((p) => p.user_id === ctx.viewer.userId);
  const doneIds = new Set((completionsRes.data ?? []).map((c) => c.step_id));
  const doneCount = steps.filter((s) => doneIds.has(s.id)).length;
  const percent = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;
  const ended = new Date().getTime() > new Date(challenge.ends_at).getTime();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/community/challenges" className="inline-flex items-center gap-1 text-sm font-medium text-[#6c6a69] hover:text-[#1a1a19]">
        <span className="material-symbols-outlined text-[18px]" aria-hidden>
          arrow_back
        </span>
        Challenges
      </Link>
      <section className={`${CARD} overflow-hidden`}>
        {challenge.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element -- challenge cover set by the team
          <img src={challenge.cover_image_url} alt="" className="h-48 w-full object-cover" />
        )}
        <div className="space-y-3 p-6">
          <p className="text-xs font-semibold text-[#6c6a69]">
            <LocalTime iso={challenge.starts_at} format="longDate" /> – <LocalTime iso={challenge.ends_at} format="longDate" /> · {challenge.points} points · {participants.length} joined
          </p>
          <h1 className="text-2xl font-bold">{challenge.title}</h1>
          {challenge.description && <RichText text={challenge.description} className="text-[15px] leading-relaxed" />}
          {mine ? (
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="font-semibold">{mine.completed_at ? "🎉 Challenge complete!" : "Your progress"}</span>
                <span className="text-[#6c6a69]">
                  {doneCount}/{steps.length} steps
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#f0efee]">
                <div className="h-full rounded-full bg-[#0e666a]" style={{ width: `${percent}%` }} />
              </div>
            </div>
          ) : ended ? (
            <p className="text-sm text-[#6c6a69]">This challenge has ended.</p>
          ) : (
            <JoinChallengeButton challengeId={challenge.id} />
          )}
        </div>
      </section>

      {steps.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Steps</h2>
          <StepList steps={steps.map((s) => ({ id: s.id, title: s.title, body: s.body, done: doneIds.has(s.id) }))} enabled={Boolean(mine) && !ended} />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Challenge discussion</h2>
        {mine && <Composer me={ctx.me} channels={[]} defaultChannelId={null} challengeId={challenge.id} placeholder="Share your progress…" />}
        {posts.length === 0 ? (
          <p className="text-sm text-[#6c6a69]">No posts yet.</p>
        ) : (
          posts.map((p) => <PostCard key={p.id} post={p} isStaff={ctx.viewer.isStaff} />)
        )}
      </section>
    </div>
  );
}
