import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { formatCents } from "@/lib/sales/pricing";
import { DEFAULT_COACHING } from "@/lib/coaching/defaults";
import { loadCoachingSettings, loadRecentBookings, loadTimeOff, type Booking } from "@/lib/coaching/server";
import { BTN_SECONDARY, Card, EmptyState, INPUT, LABEL, MUTED, Notice, PageHeader, StatusPill, TABLE, TD, TH, THEAD, TROW } from "../../_components/ui";
import { CoachingSettingsEditor } from "./CoachingSettingsEditor";
import { addTimeOff, removeTimeOff, updateBooking } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "1:1 sessions" };

const TONE = { awaiting_payment: "warning", confirmed: "published", canceled: "draft", completed: "info" } as const;
const LABELS = { awaiting_payment: "Waiting for payment", confirmed: "Confirmed", canceled: "Canceled", completed: "Done" } as const;

function BookingButtons({ booking }: { booking: Booking & { ended: boolean } }) {
  const button = (action: "paid" | "cancel" | "completed", label: string) => (
    <form action={updateBooking}>
      <input type="hidden" name="id" value={booking.id} />
      <input type="hidden" name="action" value={action} />
      <button type="submit" className={action === "cancel" ? "text-[13px] text-red-700 hover:underline" : BTN_SECONDARY}>
        {label}
      </button>
    </form>
  );
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {booking.status === "awaiting_payment" && button("paid", "Mark paid")}
      {booking.status === "confirmed" && booking.ended && button("completed", "Mark done")}
      {(booking.status === "awaiting_payment" || booking.status === "confirmed") && button("cancel", "Cancel")}
    </div>
  );
}

/** Admin → Coaching → 1:1 sessions: the setup, days off, and every booking. */
export default async function CoachingSessionsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireStaff("content");
  const params = await searchParams;
  const sb = createServiceClient();
  const [settings, timeOff, bookings] = await Promise.all([loadCoachingSettings(), loadTimeOff(), loadRecentBookings(30)]);
  const ids = [...new Set(bookings.map((b) => b.user_id))];
  const { data: emails } = ids.length ? await sb.rpc("admin_user_emails", { p_user_ids: ids }) : { data: [] };
  const emailOf = new Map(((emails ?? []) as { user_id: string; email: string }[]).map((e) => [e.user_id, e.email]));
  const zone = settings?.timezone ?? "Asia/Jerusalem";
  const when = (iso: string) =>
    new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso));

  return (
    <div className="space-y-5">
      <PageHeader
        title="1:1 sessions"
        description="Members book a time from Roni's weekly hours, then pay. Until online payment for sessions opens, send them a payment link and mark the session paid here: they get the confirmation and the meeting link."
      />
      {typeof params.ok === "string" && <Notice tone="success">{params.ok}</Notice>}
      {typeof params.error === "string" && <Notice tone="error">{params.error}</Notice>}

      <Card title="Bookings" description={`Times in Roni's time zone (${zone}). Last 30 days and upcoming.`} flush>
        {bookings.length === 0 ? (
          <EmptyState title="No bookings yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className={TABLE}>
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>When</th>
                  <th className={TH}>Member</th>
                  <th className={`${TH} max-lg:hidden`}>What about</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className={TROW}>
                    <td className={`${TD} whitespace-nowrap`}>
                      {when(b.starts_at)}
                      <span className={`block text-[12px] ${MUTED}`}>{formatCents(b.price_cents, b.currency)}</span>
                    </td>
                    <td className={TD}>{emailOf.get(b.user_id) ?? "Member"}</td>
                    <td className={`${TD} max-w-xs truncate max-lg:hidden`} title={b.topic ?? undefined}>
                      {b.topic ?? <span className={MUTED}>—</span>}
                    </td>
                    <td className={TD}>
                      <StatusPill tone={TONE[b.status]}>{LABELS[b.status]}</StatusPill>
                    </td>
                    <td className={TD}>
                      <BookingButtons booking={b} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Setup">
        <CoachingSettingsEditor initial={settings ?? DEFAULT_COACHING} />
      </Card>

      <Card title="Days off" description="Days nobody can book (in Roni's time zone).">
        <div className="space-y-4">
          {timeOff.length > 0 && (
            <ul className="space-y-2">
              {timeOff.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-3 text-[14px]">
                  <span className="font-medium">{t.starts_on === t.ends_on ? t.starts_on : `${t.starts_on} – ${t.ends_on}`}</span>
                  {t.note && <span className={MUTED}>{t.note}</span>}
                  <form action={removeTimeOff}>
                    <input type="hidden" name="id" value={t.id} />
                    <button type="submit" className="text-[13px] text-red-700 hover:underline">
                      Remove
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form action={addTimeOff} className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>From</span>
              <input type="date" name="starts_on" required className={INPUT} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Until (incl.)</span>
              <input type="date" name="ends_on" required className={INPUT} />
            </label>
            <label className="flex flex-1 flex-col gap-1.5">
              <span className={LABEL}>Note</span>
              <input name="note" maxLength={120} placeholder="Competition weekend" className={INPUT} />
            </label>
            <button type="submit" className={BTN_SECONDARY}>
              Add days off
            </button>
          </form>
        </div>
      </Card>
    </div>
  );
}
