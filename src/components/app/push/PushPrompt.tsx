"use client";

import { useEffect, useRef, useState } from "react";
import { isStandaloneApp, usePushDevice } from "./use-push-device";

const DISMISSED_KEY = "bonded_push_prompt_dismissed_at";
/** "Not now" quiets the prompt for two weeks. */
const QUIET_MS = 14 * 24 * 60 * 60 * 1000;
/** Let the app settle before asking. */
const DELAY_MS = 1200;

function recentlyDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISSED_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < QUIET_MS;
  } catch {
    return false;
  }
}

/**
 * The ask after installing: when Bonded opens from the Home Screen and this device hasn't decided
 * about notifications yet, our own card explains what they're for, and only "Turn on" triggers the
 * browser's one-time permission dialog (a cold "Allow notifications?" gets refused, for good).
 */
export function PushPrompt({ publicKey }: { publicKey: string | null }) {
  const [eligible, setEligible] = useState(false);

  // Cheap, local checks first: devices that already decided never reach the server here.
  useEffect(() => {
    if (!publicKey) return;
    const timer = window.setTimeout(() => {
      setEligible(isStandaloneApp() && "Notification" in window && Notification.permission === "default" && !recentlyDismissed());
    }, DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [publicKey]);

  if (!publicKey || !eligible) return null;
  return <PromptCard publicKey={publicKey} onClose={() => setEligible(false)} />;
}

function PromptCard({ publicKey, onClose }: { publicKey: string; onClose: () => void }) {
  const { device, status, pending, turnOn } = usePushDevice(publicKey);
  const turnOnButton = useRef<HTMLButtonElement>(null);
  const show = device === "ready" && status === "off";

  useEffect(() => {
    if (show) turnOnButton.current?.focus();
  }, [show]);

  if (!show) return null;

  function notNow() {
    onClose();
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {
      // Private mode: it simply asks again next time.
    }
  }

  return (
    <div className="push-prompt" role="dialog" aria-modal="false" aria-labelledby="push-prompt-title">
      <span className="push-banner-icon ms" aria-hidden>
        notifications_active
      </span>
      <h2 id="push-prompt-title" className="h3">
        Turn on notifications?
      </h2>
      <ul className="push-prompt-list">
        <li>When Roni replies to your video</li>
        <li>When your question gets an answer</li>
        <li>Your practice reminders and new lessons</li>
      </ul>
      <button ref={turnOnButton} type="button" className="btn btn-primary" onClick={() => turnOn(onClose)} disabled={pending}>
        {pending ? "Turning on…" : "Turn on"}
      </button>
      <button type="button" className="install-back" onClick={notNow}>
        Not now
      </button>
    </div>
  );
}
