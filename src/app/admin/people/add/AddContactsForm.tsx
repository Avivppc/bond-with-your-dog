"use client";

import { useActionState } from "react";
import Link from "next/link";
import { addContacts, type AddContactsState } from "./actions";
import type { ContactOutcome } from "../_lib/access-server";
import { BTN_PRIMARY, INPUT } from "../../_components/ui";

function outcomeText(r: ContactOutcome): { label: string; tone: string; detail?: string } {
  switch (r.status) {
    case "granted":
      return { label: "Access granted", tone: "text-[#1c6b35]" };
    case "exists":
      return { label: "Already a contact", tone: "text-[#6c6a69]", detail: "Nothing to change without an offer." };
    case "pending":
      return { label: "Access waiting", tone: "text-[#1d4f91]", detail: "Unlocks when they sign up with this email." };
    case "confirm_pending":
      return r.emailed
        ? { label: "Waiting for email confirmation", tone: "text-[#1d4f91]", detail: "They already have an account. We emailed a confirm link; access unlocks once they open it." }
        : {
            label: "Confirmation email not sent",
            tone: "text-[#8a5a00]",
            detail: "Access is saved. Ask them to sign in and press “Send me a new link” on their Home page.",
          };
    case "already_invited":
      return { label: "Already invited", tone: "text-[#6c6a69]", detail: "This offer was already waiting for them." };
    case "invited":
      return r.emailed
        ? { label: "Invited", tone: "text-[#1c6b35]", detail: "Invitation email sent." }
        : { label: "Invited — email not sent", tone: "text-[#8a5a00]", detail: "Copy their one-time link below and send it yourself." };
    case "failed":
      return { label: "Failed", tone: "text-red-700", detail: r.reason };
  }
}

function Results({ state }: { state: AddContactsState }) {
  if (state.results.length === 0) return null;
  return (
    <ul className="mt-4 divide-y divide-[#efeeed] rounded-[12px] border border-[#e7e6e4] bg-white text-[14px]">
      {state.results.map((r) => {
        const text = outcomeText(r);
        return (
          <li key={r.email} className="px-4 py-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">{r.email}</span>
              <span className={`text-[12px] font-medium ${text.tone}`}>{text.label}</span>
            </div>
            {text.detail && <p className="text-[12px] text-[#6c6a69]">{text.detail}</p>}
            {r.status === "invited" && r.link && (
              <input
                readOnly
                value={r.link}
                onFocus={(e) => e.currentTarget.select()}
                aria-label={`Invitation link for ${r.email}`}
                className="mt-1 w-full rounded-[6px] border border-[#d9d8d6] bg-[#f8f8f8] px-2 py-1 font-mono text-[11px]"
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

interface Props {
  offers: { id: string; title: string }[];
  emailConfigured: boolean;
  initial: AddContactsState;
}

export function AddContactsForm({ offers, emailConfigured, initial }: Props) {
  const [state, action, pending] = useActionState(addContacts, initial);
  const { values } = state;
  return (
    <div>
      {/* Keyed by the result so React's post-submit reset lands on the kept values. */}
      <form key={`${state.status}:${state.results.length}:${state.message}`} action={action} className="space-y-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[14px] font-medium">Emails</span>
          <textarea
            name="emails"
            required
            rows={8}
            defaultValue={values.emails}
            placeholder={"ana@example.com\nbo@example.com, cy@example.com"}
            className={`${INPUT} font-mono`}
          />
          <span className="text-[12px] text-[#6c6a69]">Separate with commas or new lines. Up to 200 at a time.</span>
        </label>
        <div className="flex flex-wrap gap-3">
          <label className="flex min-w-56 flex-1 flex-col gap-1.5">
            <span className="text-[14px] font-medium">Give access to an offer (optional)</span>
            <select name="offer_id" defaultValue={values.offerId} className={INPUT}>
              <option value="">No offer</option>
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex w-40 flex-col gap-1.5">
            <span className="text-[14px] font-medium">Days of access</span>
            <input name="days" type="number" min={1} max={36500} placeholder="Lifetime" defaultValue={values.days} className={INPUT} />
          </label>
        </div>
        <label className="flex items-start gap-2 text-[14px]">
          <input type="checkbox" name="send_invite" defaultChecked={values.sendInvite} className="mt-0.5 h-4 w-4 accent-[#343332]" />
          <span>
            Send invitation email to people without an account
            <span className="block text-[12px] text-[#6c6a69]">
              Creates their account and sends a one-time link to choose a password.
              {!emailConfigured && " Email isn't set up yet, so you'll get each link here to send yourself."}
            </span>
          </span>
        </label>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={pending} className={BTN_PRIMARY}>
            {pending ? "Adding…" : "Add contacts"}
          </button>
          <Link href="/admin/people" className="text-[14px] font-medium hover:underline">
            Cancel
          </Link>
        </div>
      </form>

      {state.status !== "idle" && (
        <p role={state.status === "error" ? "alert" : "status"} className={`mt-4 rounded-[8px] border px-4 py-3 text-[14px] ${state.status === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
          {state.message}
          {state.invalid.length > 0 && <span className="mt-1 block font-mono text-[12px]">{state.invalid.join(", ")}</span>}
        </p>
      )}
      <Results state={state} />
    </div>
  );
}
