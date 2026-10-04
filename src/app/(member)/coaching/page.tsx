import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/member/viewer";
import { formatCents } from "@/lib/sales/pricing";
import { openSlots } from "@/lib/coaching/schedule";
import { BOOKING_COLUMNS, loadBusy, loadCoachingSettings, loadTimeOff, type Booking } from "@/lib/coaching/server";
import { StateCard } from "@/components/app/ui";
import { BookingPicker } from "./BookingPicker";
import { SessionRow, type SessionView } from "./SessionRow";

export const dynamic = "force-dynamic";
export const metadata = { title: "1:1 with Roni" };

const PAST_SHOWN = 5;

/** Book a 1:1 session with Roni from her open times, then pay; see and cancel your sessions. */
export default async function CoachingPage() {
  const viewer = await requireMember("/coaching");
  const settings = await loadCoachingSettings();
  if (!settings?.enabled) {
    return (
      <StateCard icon="support_agent" eyebrow="1:1 with Roni" title="Private sessions aren't open right now">
        Ask Roni a question under any lesson, or send her a video in Feedback, and she&apos;ll get back to you.
      </StateCard>
    );
  }

  const now = new Date();
  const [timeOff, busy, { data: rows, error }] = await Promise.all([
    loadTimeOff(),
    loadBusy(settings.max_days_ahead),
    (await createClient()).from("coaching_bookings").select(BOOKING_COLUMNS).eq("user_id", viewer.userId).order("starts_at", { ascending: false }).limit(30),
  ]);
  if (error) console.error("[coaching] my bookings failed", { userId: viewer.userId, error: error.message });
  const bookings = (rows ?? []) as Booking[];
  const cancelBy = settings.cancel_hours * 3_600_000;
  const view = (b: Booking): SessionView => ({
    id: b.id,
    startsAt: b.starts_at,
    status: b.status,
    priceLabel: formatCents(b.price_cents, b.currency),
    meetingUrl: b.meeting_url,
    topic: b.topic,
    cancellable: b.status === "awaiting_payment" || (b.status === "confirmed" && new Date(b.starts_at).getTime() - now.getTime() > cancelBy),
  });
  const upcoming = bookings.filter((b) => new Date(b.ends_at) > now && (b.status === "awaiting_payment" || b.status === "confirmed")).reverse();
  const past = bookings.filter((b) => !upcoming.includes(b)).slice(0, PAST_SHOWN);
  const slots = openSlots(settings, timeOff, busy, now).map((s) => s.startsAt);
  const price = formatCents(settings.price_cents, settings.currency);

  return (
    <>
      <div className="card" style={{ background: "var(--teal)", color: "#eafcfd", gap: 12 }}>
        <span className="eyebrow" style={{ color: "#bff3f5" }}>
          1:1 with Roni
        </span>
        <h1 className="display" style={{ color: "#fff" }}>
          {settings.title}
        </h1>
        <p className="lede" style={{ color: "#d6f4f5" }}>
          {settings.description || `A private video session with Roni for you and your dog: ${settings.duration_minutes} minutes, ${price}.`}
        </p>
      </div>

      {upcoming.length > 0 && (
        <div className="card">
          <h2 className="h3">Your upcoming sessions</h2>
          <div className="stack" style={{ gap: 0 }}>
            {upcoming.map((b) => (
              <SessionRow key={b.id} session={view(b)} />
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="h3">Book a session</h2>
        <BookingPicker slots={slots} priceLabel={price} durationMinutes={settings.duration_minutes} />
      </div>

      {past.length > 0 && (
        <div className="card">
          <h2 className="h3">Earlier</h2>
          <div className="stack" style={{ gap: 0 }}>
            {past.map((b) => (
              <SessionRow key={b.id} session={{ ...view(b), cancellable: false }} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
