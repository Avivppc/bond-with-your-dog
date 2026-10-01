import { formatMoney } from "@/lib/pricing";
import { ORDER_TONE, orderStatusLabel } from "@/lib/admin-helpers/orders";
import { BTN_PRIMARY, BTN_SECONDARY, Card, INPUT, LABEL, StatusPill, TABLE, TD, TH, THEAD, TROW, type PillTone } from "../../_components/ui";
import { shortDate } from "../../_components/list-kit";
import { ConfirmSubmit } from "../../_components/ConfirmSubmit";
import { cancelAccessInvite, grantAccessByEmail, revokeCourseAccess } from "../../students/actions";
import { setTeamRole } from "./team-actions";
import type { PersonDetail } from "../_lib/person-data";

function accessText(expiresAt: string | null): { text: string; active: boolean } {
  if (!expiresAt) return { text: "Lifetime", active: true };
  const active = new Date(expiresAt) > new Date();
  return { text: `${active ? "Until" : "Ended"} ${shortDate(expiresAt)}`, active };
}

function GrantForm({ person, offers, returnTo }: { person: PersonDetail; offers: { id: string; title: string }[]; returnTo: string }) {
  if (offers.length === 0) return <p className="text-[14px] text-[#6c6a69]">Create an offer first to grant access.</p>;
  return (
    <form action={grantAccessByEmail} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="email" value={person.email} />
      <input type="hidden" name="return_to" value={returnTo} />
      <label className="flex min-w-56 flex-1 flex-col gap-1.5">
        <span className={LABEL}>Grant an offer</span>
        <select name="offer_id" required className={INPUT}>
          {offers.map((o) => (
            <option key={o.id} value={o.id}>
              {o.title}
            </option>
          ))}
        </select>
      </label>
      <label className="flex w-36 flex-col gap-1.5">
        <span className={LABEL}>Days of access</span>
        <input name="days" type="number" min={1} max={36500} placeholder="Lifetime" className={INPUT} />
      </label>
      <button type="submit" className={BTN_PRIMARY}>
        Grant access
      </button>
    </form>
  );
}

export function CoursesSection({ person, offers }: { person: PersonDetail; offers: { id: string; title: string }[] }) {
  const returnTo = `/admin/people/${person.userId}`;
  return (
    <div id="courses">
      <Card title="Courses" description="Access comes from offers. Revoking keeps their progress for a later re-grant.">
        {person.enrollments.length === 0 ? (
          <p className="text-[14px] text-[#6c6a69]">No courses yet.</p>
        ) : (
          <ul className="divide-y divide-[#efeeed] text-[14px]">
            {person.enrollments.map((e) => {
              const access = accessText(e.expires_at);
              return (
                <li key={e.course_id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className={access.active ? "font-medium" : "text-[#9b9997] line-through"}>{e.title}</span>
                    <span className="block text-[12px] text-[#6c6a69]">
                      {e.access_level === "limited" ? "Limited access" : "Full access"} · {access.text} · via {e.source ?? "—"} · since {shortDate(e.enrolled_at)}
                    </span>
                  </span>
                  {access.active && (
                    <form action={revokeCourseAccess}>
                      <input type="hidden" name="user_id" value={person.userId} />
                      <input type="hidden" name="course_id" value={e.course_id} />
                      <input type="hidden" name="return_to" value={returnTo} />
                      <ConfirmSubmit message={`Revoke ${person.email}'s access to ${e.title}?`} className="text-[12px] font-medium text-red-700 hover:underline">
                        Revoke access
                      </ConfirmSubmit>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {person.pendingInvites.length > 0 && (
          <ul className="mt-3 space-y-1 text-[14px]">
            {person.pendingInvites.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-3 rounded-[8px] bg-[#fdf1dc] px-3 py-2 text-[#8a5a00]">
                <span>Waiting for sign-up: {inv.offer ?? "an offer"} (since {shortDate(inv.created_at)})</span>
                <form action={cancelAccessInvite}>
                  <input type="hidden" name="id" value={inv.id} />
                  <input type="hidden" name="return_to" value={returnTo} />
                  <button type="submit" className="text-[12px] font-medium underline">
                    Cancel
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-5 border-t border-[#efeeed] pt-4">
          <GrantForm person={person} offers={offers} returnTo={returnTo} />
        </div>
      </Card>
    </div>
  );
}

interface LedgerRow {
  key: string;
  date: string;
  offer: string | null;
  amount: string;
  tone: PillTone;
  label: string;
}

/** Orders plus the refunds and renewals that followed them, newest first. */
function ledgerRows(person: PersonDetail): LedgerRow[] {
  const orders = person.orders.map((o): LedgerRow => ({
    key: `o-${o.id}`,
    date: o.created_at,
    offer: o.offer,
    amount: o.amount_cents === 0 ? "Free" : formatMoney(o.amount_cents, o.currency),
    tone: ORDER_TONE[o.status] ?? "draft",
    label: `Order · ${orderStatusLabel(o.status).toLowerCase()}`,
  }));
  const payments = person.payments
    .filter((p) => p.kind === "refund" || p.is_renewal)
    .map((p): LedgerRow => ({
      key: `p-${p.id}`,
      date: p.occurred_at,
      offer: p.offer,
      amount: `${p.kind === "refund" ? "−" : ""}${formatMoney(p.amount_cents, p.currency)}`,
      tone: p.kind === "refund" ? "danger" : "info",
      label: p.kind === "refund" ? "Refund" : "Renewal",
    }));
  return [...orders, ...payments].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export function OrdersSection({ person }: { person: PersonDetail }) {
  const rows = ledgerRows(person);
  return (
    <Card title="Orders & payments" flush>
      {rows.length === 0 ? (
        <p className="px-5 pb-5 text-[14px] text-[#6c6a69]">No orders yet.</p>
      ) : (
        <div className="relative overflow-x-auto">
          <table className={TABLE}>
            <thead className={THEAD}>
              <tr>
                <th className={TH}>Date</th>
                <th className={TH}>Offer</th>
                <th className={TH}>Amount</th>
                <th className={TH}>Type</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className={TROW}>
                  <td className={`${TD} whitespace-nowrap text-[#6c6a69]`}>{shortDate(r.date)}</td>
                  <td className={TD}>{r.offer ?? "—"}</td>
                  <td className={`${TD} whitespace-nowrap tabular-nums`}>{r.amount}</td>
                  <td className={TD}>
                    <StatusPill tone={r.tone}>{r.label}</StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function TeamSection({ person, canManage, isSelf }: { person: PersonDetail; canManage: boolean; isSelf: boolean }) {
  const role = person.staffRole;
  return (
    <div id="team">
      <Card title="Team role" description="Owners manage everything, including the team. Editors manage courses, contacts and sales.">
        <p className="text-[14px]">{role ? `This contact is ${role === "owner" ? "an owner" : "an editor"}.` : "Not on the team."}</p>
        {canManage && !isSelf && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(["owner", "editor"] as const)
              .filter((r) => r !== role)
              .map((r) => (
                <form key={r} action={setTeamRole}>
                  <input type="hidden" name="user_id" value={person.userId} />
                  <input type="hidden" name="role" value={r} />
                  <ConfirmSubmit message={`Make ${person.email} ${r === "owner" ? "an owner" : "an editor"}?`} className={BTN_SECONDARY}>
                    Make {r}
                  </ConfirmSubmit>
                </form>
              ))}
            {role && (
              <form action={setTeamRole}>
                <input type="hidden" name="user_id" value={person.userId} />
                <input type="hidden" name="role" value="none" />
                <ConfirmSubmit message={`Remove ${person.email} from the team?`} className={`${BTN_SECONDARY} text-red-700`}>
                  Remove from team
                </ConfirmSubmit>
              </form>
            )}
          </div>
        )}
        {canManage && isSelf && <p className="mt-2 text-[12px] text-[#6c6a69]">You can&apos;t change your own role.</p>}
        {!canManage && <p className="mt-2 text-[12px] text-[#6c6a69]">Only owners can change team roles.</p>}
      </Card>
    </div>
  );
}
