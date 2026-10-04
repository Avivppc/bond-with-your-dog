"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { coachingSettingsSchema, type CoachingSettings } from "@/lib/coaching/schedule";
import { BOOKING_COLUMNS, loadCoachingSettings, tellMemberConfirmed, type Booking } from "@/lib/coaching/server";
import { pushSoon } from "@/lib/push/server";

const PAGE = "/admin/coaching/sessions";

function back(params: Record<string, string>): never {
  redirect(`${PAGE}?${new URLSearchParams(params).toString()}`);
}

function done(): void {
  revalidatePath(PAGE);
  revalidatePath("/coaching");
}

export type SaveResult = { ok: true } | { ok: false; error: string };

/** The whole setup at once (the editor sends it as one object). */
export async function saveCoachingSettings(input: CoachingSettings): Promise<SaveResult> {
  const { user } = await requireStaff("content");
  const parsed = coachingSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the settings." };
  const { error } = await createServiceClient()
    .from("coaching_settings")
    .update({ ...parsed.data, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) {
    console.error("[coaching] settings save failed", error.message);
    return { ok: false, error: "Could not save. Please try again." };
  }
  done();
  return { ok: true };
}

const TimeOff = z.object({
  starts_on: z.string().date("Choose the first day."),
  ends_on: z.string().date("Choose the last day."),
  note: z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : null), z.string().max(120).nullable()),
});

export async function addTimeOff(formData: FormData): Promise<void> {
  await requireStaff("content");
  const parsed = TimeOff.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back({ error: parsed.error.issues[0]?.message ?? "Check the dates." });
  if (parsed.data.ends_on < parsed.data.starts_on) back({ error: "The last day comes after the first." });
  const { error } = await createServiceClient().from("coaching_time_off").insert(parsed.data);
  if (error) {
    console.error("[coaching] time off failed", error.message);
    back({ error: "Could not save the days off." });
  }
  done();
  back({ ok: "Days off saved. Existing bookings on those days stay; cancel them below if needed." });
}

export async function removeTimeOff(formData: FormData): Promise<void> {
  await requireStaff("content");
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) back({ error: "Invalid request." });
  const { error } = await createServiceClient().from("coaching_time_off").delete().eq("id", id.data);
  if (error) console.error("[coaching] time off delete failed", error.message);
  done();
  back({ ok: "Removed." });
}

const BookingAction = z.object({ id: z.string().uuid(), action: z.enum(["paid", "cancel", "completed"]) });

/** Mark paid (confirms and sends the link), cancel (tells the member), or mark done. */
export async function updateBooking(formData: FormData): Promise<void> {
  await requireStaff("content");
  const parsed = BookingAction.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back({ error: "Invalid request." });
  const { id, action } = parsed.data;
  const sb = createServiceClient();
  const now = new Date().toISOString();
  const settings = action === "paid" ? await loadCoachingSettings() : null;
  const patch =
    action === "paid"
      ? { status: "confirmed", paid_at: now, meeting_url: settings?.meeting_url ?? null }
      : action === "cancel"
        ? { status: "canceled", canceled_at: now, canceled_by: "team" }
        : { status: "completed" };
  const from = action === "paid" ? ["awaiting_payment"] : action === "cancel" ? ["awaiting_payment", "confirmed"] : ["confirmed"];
  const { data, error } = await sb.from("coaching_bookings").update(patch).eq("id", id).in("status", from).select(BOOKING_COLUMNS).maybeSingle();
  if (error || !data) {
    console.error("[coaching] booking update failed", { id, action, error: error?.message ?? "wrong status" });
    back({ error: error ? "Could not update the session." : "This session has already changed. Refresh the page." });
  }
  const booking = data as Booking;

  if (action === "paid") {
    const { data: profile } = await sb.from("profiles").select("timezone").eq("id", booking.user_id).maybeSingle();
    if (settings) await tellMemberConfirmed(booking, settings, (profile?.timezone as string | null) ?? null);
  }
  if (action === "cancel") {
    const { error: noticeError } = await sb.from("notifications").insert({
      user_id: booking.user_id,
      kind: "system",
      title: "Your 1:1 session with Roni was canceled",
      body: booking.paid_at ? "Roni's team will be in touch about a new time or a refund." : "You can book another time on your Coaching page.",
      href: "/coaching",
    });
    if (noticeError) console.error("[coaching] cancel notice failed", { id, error: noticeError.message });
    pushSoon(booking.user_id);
  }
  done();
  back({ ok: action === "paid" ? "Marked paid. The member got the confirmation and the link." : action === "cancel" ? "Session canceled. The member was told." : "Marked done." });
}
