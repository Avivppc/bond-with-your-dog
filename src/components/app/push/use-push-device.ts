"use client";

import { useEffect, useState, useTransition } from "react";
import { isDeviceOn, removePushSubscription, savePushSubscription, sendPushTest } from "@/app/(member)/settings/push-actions";

/**
 * Phone notifications on this device, shared by Settings, the Notifications page and the prompt
 * after installing: what the device can do, whether it's on for this member, and the actions.
 */
export type PushDevice = "checking" | "unsupported" | "install-first" | "ready";
export type PushStatus = "unknown" | "off" | "on" | "blocked";

export function isStandaloneApp(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

/** What this browser can do; iPhones only allow notifications for the app on the Home Screen. */
function deviceSnapshot(): PushDevice {
  // iPadOS Safari says "Macintosh"; touch support gives it away.
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios && !isStandaloneApp()) return "install-first";
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

export function usePushDevice(publicKey: string | null) {
  const [device, setDevice] = useState<PushDevice>("checking");
  const [status, setStatus] = useState<PushStatus>("unknown");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Is it switched on for this member? (A device another account turned on stays off until this
  // member turns it on.) Runs after hydration: the server can't know the device.
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

  /** Asks the browser (call it straight from a tap: browsers only ask on a user gesture). */
  function turnOn(onDone?: (on: boolean) => void) {
    if (!publicKey) return;
    setMessage(null);
    start(async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus(permission === "denied" ? "blocked" : "off");
          onDone?.(false);
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
          onDone?.(false);
          return;
        }
        setStatus("on");
        setMessage("Notifications are on for this device.");
        onDone?.(true);
      } catch (error) {
        console.error("[push] subscribe failed", error);
        setMessage("This browser couldn't turn on notifications. Please try again.");
        onDone?.(false);
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

  return { device, status, message, pending, turnOn, turnOff, test };
}
