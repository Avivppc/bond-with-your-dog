"use client";

import { useState, useTransition } from "react";
import { acceptOfferToStay, cancelSubscription } from "./actions";
import { useToast } from "../feedback/_components/Toast";

interface CancelSubscriptionProps {
  subscriptionId: string;
  title: string;
  /** "30% off your next 3 months", when the offer has an offer to stay the member hasn't taken. */
  offerToStay: string | null;
}

/** "Cancel subscription" with a confirm step (and, when set up, an offer to stay first). */
export function CancelSubscription({ subscriptionId, title, offerToStay }: CancelSubscriptionProps) {
  const [confirming, setConfirming] = useState(false);
  const [offerShown, setOfferShown] = useState(Boolean(offerToStay));
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

  function stay() {
    setError(null);
    start(async () => {
      const res = await acceptOfferToStay(subscriptionId);
      if (!res.ok) return setError(res.error);
      setConfirming(false);
      showToast(res.message);
    });
  }

  if (confirming && offerShown && offerToStay) {
    return (
      <div className="stack" style={{ gap: 8, alignItems: "flex-end", maxWidth: 320, textAlign: "right" }}>
        <b>Before you go: {offerToStay}</b>
        <span className="faint">Stay with {title} and keep training with your dog at a lower price.</span>
        {error && (
          <span role="alert" style={{ color: "var(--danger)" }}>
            {error}
          </span>
        )}
        <div className="row">
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setOfferShown(false)} disabled={pending}>
            No thanks
          </button>
          <button className="btn btn-primary btn-sm" type="button" onClick={stay} disabled={pending}>
            {pending ? "Saving…" : "Stay with the discount"}
          </button>
        </div>
        {toast}
      </div>
    );
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
