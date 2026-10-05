"use client";

import { useState, useTransition } from "react";
import { resendVerifyEmail } from "@/app/(member)/member-actions";
import { Ms } from "@/components/app/ui";

type State = "idle" | "sent" | "error";

/** Home reminder until the member proves their inbox; "expired" when an old link was used. */
export function VerifyEmailNotice({ email, expired }: { email: string; expired: boolean }) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function resend() {
    start(async () => {
      const res = await resendVerifyEmail();
      if (res.ok) {
        setState("sent");
        return;
      }
      setError(res.error);
      setState("error");
    });
  }

  return (
    <div className="tip warm" role="status">
      <Ms name="mark_email_unread" />
      <div className="grow stack" style={{ gap: 8 }}>
        <span>
          <strong>{expired ? "That link has expired." : "Please confirm your email."}</strong>{" "}
          {state === "sent"
            ? `A new link is on its way to ${email}.`
            : `It unlocks any chapters bought or gifted to ${email}. The link is in your welcome email.`}
        </span>
        {state === "error" && error && <span>{error}</span>}
        {state !== "sent" && (
          <button type="button" className="btn btn-ghost" style={{ alignSelf: "flex-start" }} onClick={resend} disabled={pending}>
            {pending ? "Sending…" : "Send me a new link"}
          </button>
        )}
      </div>
    </div>
  );
}
