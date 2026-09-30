"use client";

import { useActionState } from "react";
import { sendPasswordReset, type ResetState } from "./actions";

const INITIAL: ResetState = { status: "idle", message: "" };

/** "Send password reset" with its result inline (and the copyable link when email is off). */
export function PasswordResetButton({ userId, className }: { userId: string; className: string }) {
  const [state, action, pending] = useActionState(sendPasswordReset, INITIAL);
  return (
    <form action={action}>
      <input type="hidden" name="user_id" value={userId} />
      <button type="submit" disabled={pending} className={className}>
        {pending ? "Sending…" : "Send password reset"}
      </button>
      {state.status !== "idle" && (
        <div role={state.status === "error" ? "alert" : "status"} className="mt-1 px-3 pb-2 text-[12px] leading-snug">
          <p className={state.status === "error" ? "text-red-700" : state.status === "sent" ? "text-emerald-800" : "text-[#8a5a00]"}>{state.message}</p>
          {state.link && (
            <input
              readOnly
              value={state.link}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Password reset link"
              className="mt-1 w-full rounded-[6px] border border-[#d9d8d6] bg-[#f8f8f8] px-2 py-1 font-mono text-[11px]"
            />
          )}
        </div>
      )}
    </form>
  );
}
