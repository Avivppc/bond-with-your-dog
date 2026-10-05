"use client";

import { openInstallGuide } from "@/components/app/install/install-store";
import { usePushDevice } from "./use-push-device";

/**
 * Top of the Notifications page: invites this device to get these on the phone too. Disappears
 * once notifications are on here (or where the browser can't do them at all).
 */
export function PushBanner({ publicKey }: { publicKey: string | null }) {
  const { device, status, message, pending, turnOn } = usePushDevice(publicKey);
  if (!publicKey || device === "checking" || device === "unsupported") return null;
  if (device === "ready" && (status === "on" || status === "unknown")) return message ? <p className="faint" role="status">{message}</p> : null;

  return (
    <div className="card push-banner">
      <span className="push-banner-icon ms" aria-hidden>
        notifications_active
      </span>
      <div className="grow">
        <b>Get these on your phone</b>
        <div className="faint">
          {device === "install-first"
            ? "On iPhone, add Bonded to your Home Screen first. Then Roni's replies and your reminders arrive like any app's."
            : status === "blocked"
              ? "Notifications are blocked for Bonded in this browser's settings. Allow them there, then reload this page."
              : "Roni's replies, answers and your practice reminders, even when Bonded is closed."}
        </div>
        {message && (
          <div className="faint" role="status">
            {message}
          </div>
        )}
      </div>
      {device === "install-first" && (
        <button type="button" className="btn btn-primary btn-sm" onClick={() => openInstallGuide("settings")}>
          Show me how
        </button>
      )}
      {device === "ready" && status === "off" && (
        <button type="button" className="btn btn-primary btn-sm" onClick={() => turnOn()} disabled={pending}>
          {pending ? "Turning on…" : "Turn on"}
        </button>
      )}
    </div>
  );
}
