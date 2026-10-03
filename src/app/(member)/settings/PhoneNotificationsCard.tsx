"use client";

import { useEffect, useState, useTransition } from "react";
import { isDeviceOn, removePushSubscription, savePushSubscription, sendPushTest } from "./push-actions";

type Device = "checking" | "unsupported" | "install-first" | "ready";
type Status = "unknown" | "off" | "on" | "blocked";

/** What this browser can do; iPhones only allow notifications for the app on the home screen. */
function deviceSnapshot(): Device {
  // iPadOS Safari says "Macintosh"; touch support gives it away.
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (ios && !standalone) return "install-first";
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window ? "ready" : "unsupported";
}

function keyBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  return navigator.serviceWorker.ready;
}

function asInput(sub: PushSubscription) {
  const json = sub.toJSON();
  return { endpoint: json.endpoint ?? "", keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" } };
}

/**
 * Settings → Phone notifications: turn on notifications for this device (each phone or computer
 * separately), turn them off, or send a test. Everything the bell shows then reaches the phone.
 */
export function PhoneNotificationsCard({ publicKey }: { publicKey: string | null }) {
  const [device, setDevice] = useState<Device>("checking");
  const [status, setStatus] = useState<Status>("unknown");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // What this device can do, and is it switched on for this member? (A device another account
  // turned on stays off until this member turns it on.) Runs after hydration.
  useEffect(() => {
    if (!publicKey) return;
    let cancelled = false;
    Promise.resolve()
      .then(() => {
        const found = deviceSnapshot();
        if (!cancelled) setDevice(found);
        // getRegistration, not .ready: .ready never settles on a device that hasn't registered yet.
        return found === "ready" ? navigator.serviceWorker.getRegistration("/") : undefined;
      })
      .then((reg) => reg?.pushManager.getSubscription() ?? null)
      .then(async (sub) => {
        if (cancelled || deviceSnapshot() !== "ready") return;
        if (Notification.permission === "denied") return setStatus("blocked");
        if (!sub) return setStatus("off");
        const res = await isDeviceOn(sub.endpoint);
        if (cancelled) return;
        if (!res.ok) setMessage(res.error);
        setStatus(res.ok && res.data ? "on" : "off");
      })
      .catch((error: unknown) => {
        console.error("[push] status check failed", error);
        if (!cancelled) setStatus("off");
      });
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  function turnOn() {
    if (!publicKey) return;
    setMessage(null);
    start(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus(permission === "denied" ? "blocked" : "off");
          return;
        }
        const reg = await registration();
        // A subscription made with an older key can't be reused.
        await (await reg.pushManager.getSubscription())?.unsubscribe();
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
        const res = await savePushSubscription(asInput(sub), navigator.userAgent);
        if (!res.ok) {
          await sub.unsubscribe();
          setMessage(res.error);
          return;
        }
        setStatus("on");
        setMessage("Notifications are on for this device.");
      } catch (error) {
        console.error("[push] subscribe failed", error);
        setMessage("This browser couldn't turn on notifications. Please try again.");
      }
    });
  }

  function turnOff() {
    setMessage(null);
    start(async () => {
      try {
        const sub = (await (await navigator.serviceWorker.getRegistration("/"))?.pushManager.getSubscription()) ?? null;
        if (sub) {
          const res = await removePushSubscription(sub.endpoint);
          if (!res.ok) return setMessage(res.error);
          await sub.unsubscribe();
        }
        setStatus("off");
        setMessage("Notifications are off for this device.");
      } catch (error) {
        console.error("[push] unsubscribe failed", error);
        setMessage("Couldn't turn notifications off. Please try again.");
      }
    });
  }

  function test() {
    setMessage(null);
    start(async () => {
      const res = await sendPushTest();
      setMessage(res.ok ? "Test sent. It should arrive in a few seconds." : res.error);
    });
  }

  if (!publicKey) return null;

  return (
    <div className="card">
      <h2 className="h3">Phone notifications</h2>
      <p className="faint">Get Roni&apos;s feedback, answers, new lessons and practice reminders on this device, even when Bonded is closed.</p>
      {device === "install-first" && (
        <p>
          On iPhone, first add Bonded to your home screen: tap <b>Share</b>, then <b>Add to Home Screen</b>. Open Bonded from the new icon and come back here.
        </p>
      )}
      {device === "unsupported" && <p className="faint">This browser doesn&apos;t support notifications. Try Chrome, Edge, Firefox or Safari.</p>}
      {device === "ready" && status === "blocked" && (
        <p className="faint">Notifications are blocked for Bonded in this browser&apos;s settings. Allow them there, then reload this page.</p>
      )}
      {device === "ready" && (status === "off" || status === "on") && (
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          {status === "off" ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={turnOn} disabled={pending}>
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
