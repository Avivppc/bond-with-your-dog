"use client";

import { useState, useTransition } from "react";
import { cancelSubscription } from "./actions";
import { useToast } from "../feedback/_components/Toast";

/** "Cancel subscription" with a confirm step. */
export function CancelSubscription({ subscriptionId, title }: { subscriptionId: string; title: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [toast, showToast] = useToast();

  function cancel() {
    setError(null);
    start(async () => {
      const res = await cancelSubscription(subscriptionId);
      if (!res.ok) return setError(res.error);
      setConfirming(false);
      showToast(res.message);
    });
  }

  if (!confirming) {
    return (
      <>
        <button className="link" type="button" onClick={() => setConfirming(true)}>
          Cancel subscription
        </button>
        {toast}
      </>
    );
  }
  return (
    <div className="stack" style={{ gap: 8, alignItems: "flex-end" }}>
      <span className="faint">Stop {title} from renewing?</span>
      {error && (
        <span role="alert" style={{ color: "var(--danger)" }}>
          {error}
        </span>
      )}
      <div className="row">
        <button className="btn btn-ghost btn-sm" type="button" onClick={() => setConfirming(false)}>
          Keep it
        </button>
        <button className="btn btn-danger btn-sm" type="button" onClick={cancel} disabled={pending}>
          {pending ? "Canceling…" : "Cancel subscription"}
        </button>
      </div>
      {toast}
    </div>
  );
}
