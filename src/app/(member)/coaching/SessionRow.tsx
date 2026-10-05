"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ms } from "@/components/app/ui";
import { cancelSession } from "./actions";

export interface SessionView {
  id: string;
  startsAt: string;
  status: "awaiting_payment" | "confirmed" | "canceled" | "completed";
  priceLabel: string;
  meetingUrl: string | null;
  topic: string | null;
  /** Whether the member can still cancel it here. */
  cancellable: boolean;
}

const STATUS: Record<SessionView["status"], string> = {
  awaiting_payment: "Waiting for payment",
  confirmed: "Confirmed",
  canceled: "Canceled",
  completed: "Done",
};

/** One booked session: when (in the member's zone), its state, and what they can do with it. */
export function SessionRow({ session }: { session: SessionView }) {
  const router = useRouter();
  const [label, setLabel] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => {
    const timer = setTimeout(
      () => setLabel(new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(session.startsAt))),
      0,
    );
    return () => clearTimeout(timer);
  }, [session.startsAt]);

  return (
    <div className="list-row" style={{ alignItems: "flex-start" }}>
      <Ms name={session.status === "confirmed" ? "event_available" : session.status === "awaiting_payment" ? "pending" : "event_busy"} />
      <div className="grow stack" style={{ gap: 4 }}>
        <div className="title">{label ?? "…"}</div>
        <div className="faint">
          {STATUS[session.status]} · {session.priceLabel}
        </div>
        {session.status === "awaiting_payment" && (
          <div className="faint">
            Next step: payment. Online payment for sessions opens soon; until then Roni&apos;s team emails you a payment link within a day. The time is held for
            48 hours.
          </div>
        )}
        {session.status === "confirmed" && (
          <div className="row" style={{ gap: 12 }}>
            {session.meetingUrl && (
              <a className="link" href={session.meetingUrl} target="_blank" rel="noreferrer">
                Join the meeting
              </a>
            )}
            <a className="link" href={`/coaching/${session.id}/calendar`} download="bonded-session.ics">
              Add to calendar
            </a>
          </div>
        )}
        {error && (
          <span role="alert" style={{ color: "var(--danger)" }}>
            {error}
          </span>
        )}
      </div>
      {session.cancellable &&
        (confirming ? (
          <div className="row" style={{ gap: 6 }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)} disabled={pending}>
              Keep it
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await cancelSession(session.id);
                  if (!res.ok) return setError(res.error);
                  router.refresh();
                })
              }
            >
              {pending ? "Canceling…" : "Cancel session"}
            </button>
          </div>
        ) : (
          <button type="button" className="link" onClick={() => setConfirming(true)}>
            Cancel
          </button>
        ))}
    </div>
  );
}
