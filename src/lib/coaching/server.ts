import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendEmail, siteUrl } from "@/lib/email";
import { notifyTeam } from "@/lib/notify-team";
import { pushSoon } from "@/lib/push/server";
import { formatCents } from "@/lib/sales/pricing";
import { coachingSettingsSchema, type Busy, type CoachingSettings, type TimeOff } from "./schedule";

export const SETTINGS_COLUMNS =
  "enabled, title, description, duration_minutes, buffer_minutes, price_cents, currency, timezone, weekly, min_notice_hours, max_days_ahead, cancel_hours, meeting_url";

export const BOOKING_COLUMNS = "id, user_id, starts_at, ends_at, status, price_cents, currency, topic, meeting_url, paid_at, canceled_at, canceled_by, created_at";

export interface Booking {
  id: string;
  user_id: string;
  starts_at: string;
  ends_at: string;
  status: "awaiting_payment" | "confirmed" | "canceled" | "completed";
  price_cents: number;
  currency: string;
  topic: string | null;
  meeting_url: string | null;
  paid_at: string | null;
  canceled_at: string | null;
  canceled_by: "member" | "team" | null;
  created_at: string;
}

/** The coaching setup; a row that doesn't pass the rules (should never happen) reads as closed. */
export async function loadCoachingSettings(): Promise<CoachingSettings | null> {
  const { data, error } = await createServiceClient().from("coaching_settings").select(SETTINGS_COLUMNS).eq("id", 1).maybeSingle();
  if (error) console.error("[coaching] settings load failed", error.message);
  const parsed = coachingSettingsSchema.safeParse(data);
  if (!parsed.success) {
    if (data) console.error("[coaching] settings don't pass the rules", parsed.error.issues[0]?.message);
    return null;
  }
  return parsed.data;
}

/** The admin's list: the last `days` and everything upcoming, each marked when it has ended. */
export async function loadRecentBookings(days: number): Promise<(Booking & { ended: boolean })[]> {
  const now = Date.now();
  const { data, error } = await createServiceClient()
    .from("coaching_bookings")
    .select(BOOKING_COLUMNS)
    .gte("ends_at", new Date(now - days * 86_400_000).toISOString())
    .order("starts_at")
    .limit(200);
  if (error) console.error("[coaching] bookings failed", error.message);
  return ((data ?? []) as Booking[]).map((b) => ({ ...b, ended: new Date(b.ends_at).getTime() < now }));
}

export async function loadTimeOff(): Promise<(TimeOff & { id: string; note: string | null })[]> {
  const { data, error } = await createServiceClient()
    .from("coaching_time_off")
    .select("id, starts_on, ends_on, note")
    .gte("ends_on", new Date().toISOString().slice(0, 10))
    .order("starts_on");
  if (error) console.error("[coaching] time off load failed", error.message);
  return (data ?? []) as (TimeOff & { id: string; note: string | null })[];
}

export async function loadBusy(untilDays: number): Promise<Busy[]> {
  const until = new Date(Date.now() + (untilDays + 1) * 86_400_000).toISOString();
  const { data, error } = await createServiceClient().rpc("coaching_busy", { p_until: until });
  if (error) console.error("[coaching] busy load failed", error.message);
  return (data ?? []) as Busy[];
}

function when(iso: string, zone: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(
    new Date(iso),
  );
}

/** A new booking: the team hears about it (to send the payment link until online payment opens). */
export async function tellTeamAboutBooking(booking: Booking, memberEmail: string, settings: CoachingSettings): Promise<void> {
  await notifyTeam("orders", {
    subject: `New 1:1 booking: ${when(booking.starts_at, settings.timezone)}`.slice(0, 150),
    lines: [
      `${memberEmail} booked ${settings.title} for ${when(booking.starts_at, settings.timezone)} (${formatCents(booking.price_cents, booking.currency)}).`,
      "It's waiting for payment. Once they've paid, mark it paid in the admin and they get the meeting link.",
    ],
    quoted: booking.topic ?? undefined,
    path: "/admin/coaching/sessions",
  });
}

/** Paid (or confirmed by the team): the member hears in the app, on their phone and by email, with the link. */
export async function tellMemberConfirmed(booking: Booking, settings: CoachingSettings, memberZone: string | null): Promise<void> {
  const sb = createServiceClient();
  const zone = memberZone || settings.timezone;
  const title = `Your session with Roni is confirmed: ${when(booking.starts_at, zone)}`.slice(0, 160);
  const { error } = await sb.from("notifications").insert({
    user_id: booking.user_id,
    kind: "system",
    title,
    body: booking.meeting_url ? "The meeting link is on your Coaching page." : "Roni's team will send the meeting link before the session.",
    href: "/coaching",
  });
  if (error) console.error("[coaching] confirmation notice failed", { bookingId: booking.id, error: error.message });
  pushSoon(booking.user_id);

  const { data: user } = await sb.auth.admin.getUserById(booking.user_id);
  const email = user.user?.email;
  if (!email) return;
  await sendEmail({
    to: email,
    subject: "Your 1:1 session with Roni is confirmed",
    text: [
      "Hi,",
      "",
      `Your ${settings.title} is confirmed for ${when(booking.starts_at, zone)} (${settings.duration_minutes} minutes).`,
      booking.meeting_url ? `Join here: ${booking.meeting_url}` : "We'll send you the meeting link before the session.",
      "",
      `Add it to your calendar or see the details: ${siteUrl()}/coaching`,
      "",
      "See you there,",
      "Roni's team",
    ].join("\n"),
  });
}
