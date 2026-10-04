"use client";

import { openInstallGuide } from "@/components/app/install/install-store";
import { usePushDevice } from "@/components/app/push/use-push-device";

/**
 * Settings → Phone notifications: turn on notifications for this device (each phone or computer
 * separately), turn them off, or send a test. Everything the bell shows then reaches the phone.
 */
export function PhoneNotificationsCard({ publicKey }: { publicKey: string | null }) {
  const { device, status, message, pending, turnOn, turnOff, test } = usePushDevice(publicKey);
  if (!publicKey) return null;

  return (
    <div className="card">
      <h2 className="h3">Phone notifications</h2>
      <p className="faint">Get Roni&apos;s feedback, answers, new lessons and practice reminders on this device, even when Bonded is closed.</p>
      {device === "install-first" && (
        <>
          <p>On iPhone, notifications work once Bonded is on your Home Screen. Install it, open Bonded from the new icon and come back here.</p>
          <button type="button" className="btn btn-primary btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => openInstallGuide("settings")}>
            Show me how
          </button>
        </>
      )}
      {device === "unsupported" && <p className="faint">This browser doesn&apos;t support notifications. Try Chrome, Edge, Firefox or Safari.</p>}
      {device === "ready" && status === "blocked" && (
        <p className="faint">Notifications are blocked for Bonded in this browser&apos;s settings. Allow them there, then reload this page.</p>
      )}
      {device === "ready" && (status === "off" || status === "on") && (
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          {status === "off" ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => turnOn()} disabled={pending}>
              {pending ? "Turning on…" : "Turn on for this device"}
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-ghost btn-sm" onClick={test} disabled={pending}>
                Send a test
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={turnOff} disabled={pending}>
                Turn off
              </button>
            </>
          )}
        </div>
      )}
      {message && (
        <p role="status" className="faint">
          {message}
        </p>
      )}
    </div>
  );
}
