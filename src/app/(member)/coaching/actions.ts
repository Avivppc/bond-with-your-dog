"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/member/result";
import { BOOKING_COLUMNS, loadCoachingSettings, tellTeamAboutBooking, type Booking } from "@/lib/coaching/server";
import { notifyTeam } from "@/lib/notify-team";
import { formatCents } from "@/lib/sales/pricing";

const Book = z.object({ startsAt: z.string().datetime(), topic: z.string().trim().max(1000).default("") });

const BOOK_ERRORS: Record<string, string> = {
  "23P01": "Someone just booked that time. Please pick another one.",
  "54000": "You already have 3 upcoming sessions. Cancel one or wait until after them.",
};

/** Books an open time (the database checks it really is one) and lets the team know. */
export async function bookSession(input: z.input<typeof Book>): Promise<ActionResult<{ id: string }>> {
  const parsed = Book.safeParse(input);
  if (!parsed.success) return fail("Pick a time first.");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return fail("Please sign in again.");

  const { data: id, error } = await supabase.rpc("book_coaching_session", { p_starts_at: parsed.data.startsAt, p_topic: parsed.data.topic });
  if (error || typeof id !== "string") {
    if (error?.code && BOOK_ERRORS[error.code]) return fail(BOOK_ERRORS[error.code]);
    if (error?.code === "22023") return fail("That time isn't available anymore. Please pick another one.");
    console.error("[coaching] booking failed", { error: error?.message });
    return fail("Couldn't book that time. Please try again.");
  }
  const [{ data: booking }, settings] = await Promise.all([supabase.from("coaching_bookings").select(BOOKING_COLUMNS).eq("id", id).maybeSingle(), loadCoachingSettings()]);
  if (booking && settings) await tellTeamAboutBooking(booking as Booking, user.email, settings);
  revalidatePath("/coaching");
  return ok({ id });
}

/** Cancels the member's own booking (the database enforces how late that's allowed). */
export async function cancelSession(bookingId: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(bookingId).success) return fail("Unknown session.");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // RLS: only the member's own booking is found.
  const { data: before } = await supabase.from("coaching_bookings").select(BOOKING_COLUMNS).eq("id", bookingId).maybeSingle();
  const { error } = await supabase.rpc("cancel_coaching_booking", { p_booking_id: bookingId });
  if (error) {
    if (error.code === "22023") return fail("It's too close to the session to cancel here. Please write to us from Help.");
    console.error("[coaching] cancel failed", { bookingId, error: error.message });
    return fail("Couldn't cancel. Please try again.");
  }
  const booking = before as Booking | null;
  if (booking?.paid_at) {
    await notifyTeam("orders", {
      subject: "A paid 1:1 session was canceled by the member",
      lines: [
        `${user?.email ?? "A member"} canceled their paid session on ${new Date(booking.starts_at).toUTCString()}.`,
        `They paid ${formatCents(booking.price_cents, booking.currency)}: refund them or agree on a new time.`,
      ],
      path: "/admin/coaching/sessions",
    });
  }
  revalidatePath("/coaching");
  return ok(undefined);
}
