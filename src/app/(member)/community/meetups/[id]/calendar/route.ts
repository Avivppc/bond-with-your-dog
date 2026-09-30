import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildIcs } from "@/lib/member/ics";
import { siteUrl } from "@/lib/email";

/** "Add to calendar" for a meetup or Live Q&A the member can see (RLS decides). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const supabase = await createClient();
  const { data: meetup } = await supabase
    .from("community_meetups")
    .select("id, title, description, starts_at, duration_minutes, location")
    .eq("id", id)
    .maybeSingle();
  if (!meetup) return NextResponse.json({ error: "not found" }, { status: 404 });

  const ics = buildIcs({
    uid: meetup.id,
    title: meetup.title,
    description: meetup.description,
    location: meetup.location,
    url: `${siteUrl()}/community/meetups/${meetup.id}`,
    start: new Date(meetup.starts_at),
    durationMinutes: meetup.duration_minutes,
  });
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="bonded-${meetup.id.slice(0, 8)}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
