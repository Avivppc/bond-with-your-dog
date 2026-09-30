import Link from "next/link";
import { notFound } from "next/navigation";
import { communityContext } from "@/lib/community/context";
import { loadAuthors } from "@/lib/community/queries";
import { Avatar, CARD, RichText } from "@/components/community/bits";
import { RsvpButton } from "@/components/community/ChallengeControls";
import { LocalTime } from "@/components/ui/LocalTime";

export const dynamic = "force-dynamic";

const EARLY_JOIN_MINUTES = 15; // enforced by community_meetup_link

export default async function MeetupPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await communityContext();
  if (!ctx.viewer.canAccess) return null;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: meetup } = await ctx.supabase
    .from("community_meetups")
    .select("id, title, description, starts_at, duration_minutes, location, cover_image_url, canceled, has_meeting_link")
    .eq("id", id)
    .maybeSingle();
  if (!meetup) notFound();
  // The database only hands out the link from 15 minutes before the start until the end.
  const { data: meetingUrl } = await ctx.supabase.rpc("community_meetup_link", { p_meetup_id: id });
  const { data: rsvps } = await ctx.supabase.from("community_rsvps").select("user_id").eq("meetup_id", id);
  const goingIds = (rsvps ?? []).map((r) => r.user_id);
  const people = await loadAuthors(ctx.supabase, goingIds.slice(0, 40));
  const start = new Date(meetup.starts_at);
  const end = new Date(start.getTime() + meetup.duration_minutes * 60_000);
  const now = new Date().getTime();
  const isPast = end.getTime() < now;
  const joinUrl = typeof meetingUrl === "string" && meetingUrl.startsWith("https://") ? meetingUrl : null;
  const going = goingIds.includes(ctx.viewer.userId);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/community/meetups" className="inline-flex items-center gap-1 text-sm font-medium text-[#6c6a69] hover:text-[#1a1a19]">
        <span className="material-symbols-outlined text-[18px]" aria-hidden>
          arrow_back
        </span>
        Meetups
      </Link>
      <section className={`${CARD} overflow-hidden`}>
        {meetup.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element -- meetup cover set by the team
          <img src={meetup.cover_image_url} alt="" className="h-48 w-full object-cover" />
        )}
        <div className="space-y-3 p-6">
          {meetup.canceled && <p className="rounded-[10px] bg-[#fde8e8] px-3 py-2 text-sm font-semibold text-[#a4262c]">This meetup was canceled.</p>}
          <h1 className="text-2xl font-bold">{meetup.title}</h1>
          <p className="text-sm text-[#6c6a69]">
            <LocalTime iso={meetup.starts_at} format="longDateTime" /> – <LocalTime iso={end.toISOString()} format="time" zoneLabel />
            {meetup.location ? ` · ${meetup.location}` : ""}
          </p>
          {meetup.description && <RichText text={meetup.description} className="text-[15px] leading-relaxed" />}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {!meetup.canceled && !isPast && <RsvpButton meetupId={meetup.id} going={going} />}
            {joinUrl && (
              <a href={joinUrl} target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#ff8f00] px-4 py-2 text-sm font-semibold text-white">
                Join now
              </a>
            )}
            {!joinUrl && !isPast && meetup.has_meeting_link && !meetup.canceled && (
              <span className="text-xs text-[#6c6a69]">The join link appears {EARLY_JOIN_MINUTES} minutes before the start.</span>
            )}
          </div>
        </div>
      </section>
      <section className={`${CARD} p-5`}>
        <h2 className="font-semibold">{goingIds.length} going</h2>
        {goingIds.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-3">
            {goingIds.slice(0, 40).map((uid) => {
              const person = people.get(uid);
              return person ? (
                <li key={uid}>
                  <Link href={`/community/members/${uid}`} className="flex items-center gap-2 text-sm hover:underline">
                    <Avatar author={person} size={28} />
                    {person.name}
                  </Link>
                </li>
              ) : null;
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
