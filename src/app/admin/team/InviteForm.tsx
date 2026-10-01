"use client";

import { useActionState } from "react";
import { BTN_PRIMARY, INPUT, LABEL } from "../_components/ui";
import { inviteToTeam, type TeamInviteState } from "./invite-action";

const INITIAL: TeamInviteState = { status: "idle", message: "", link: null, email: "" };

/** "Invite a user": email + role; shows the one-time link when email isn't set up. */
export function InviteForm() {
  const [state, action, pending] = useActionState(inviteToTeam, INITIAL);
  return (
    <div className="space-y-3">
      <form action={action} className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-56 flex-1 flex-col gap-1.5">
          <span className={LABEL}>Email</span>
          <input name="email" type="email" required placeholder="name@example.com" defaultValue={state.status === "error" ? state.email : ""} className={INPUT} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Role</span>
          <select name="role" defaultValue="editor" className={INPUT}>
            <option value="editor">Content editor</option>
            <option value="owner">Owner</option>
          </select>
        </label>
        <button type="submit" className={BTN_PRIMARY} disabled={pending}>
          {pending ? "Inviting…" : "Send invite"}
        </button>
      </form>
      {state.status !== "idle" && (
        <div role={state.status === "error" ? "alert" : "status"} className={`rounded-[8px] p-3 text-sm ${state.status === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>
          <p>{state.message}</p>
          {state.link && (
            <input
              readOnly
              value={state.link}
              onFocus={(e) => e.currentTarget.select()}
              aria-label={`One-time link for ${state.email}`}
              className="mt-2 w-full rounded-[6px] border border-[#d9d8d6] bg-white px-2 py-1 font-mono text-[11px] text-[#1a1a19]"
            />
          )}
        </div>
      )}
    </div>
  );
}
