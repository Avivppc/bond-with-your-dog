import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildIcs } from "@/lib/member/ics";
import { siteUrl } from "@/lib/email";

/** "Add to calendar" for the member's own confirmed 1:1 session (RLS: own bookings only). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const supabase = await createClient();
  const { data: booking } = await supabase
    .from("coaching_bookings")
    .select("id, starts_at, ends_at, status, meeting_url, topic")
    .eq("id", id)
    .eq("status", "confirmed")
    .maybeSingle();
  if (!booking) return NextResponse.json({ error: "not found" }, { status: 404 });

  const ics = buildIcs({
    uid: `coaching-${booking.id}`,
    title: "1:1 session with Roni (Bonded)",
    description: booking.topic,
    location: booking.meeting_url,
    url: booking.meeting_url ?? `${siteUrl()}/coaching`,
    start: new Date(booking.starts_at),
    durationMinutes: Math.round((new Date(booking.ends_at).getTime() - new Date(booking.starts_at).getTime()) / 60_000),
  });
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="bonded-session.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
