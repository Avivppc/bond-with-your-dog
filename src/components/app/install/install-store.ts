"use client";

import { useEffect, useState } from "react";
import { EVENTS, track } from "@/lib/analytics";
import { installGuideOf, installPlatformOf, isInAppBrowserUa, type InstallGuide, type InstallPlatform } from "@/lib/install/browser-env";

/**
 * Install state for "Install app" (ported from SkiFit):
 *  - installed    running from the Home Screen: never ask
 *  - available    Chrome/Edge fired beforeinstallprompt: one tap installs
 *  - manual       no programmatic prompt (iPhone always; Android until Chrome decides to fire
 *                 its event): the guide walks through the browser's own menu
 *  - unsupported  desktop Safari/Firefox, Instagram's browser…: hide rather than promise
 */
export type InstallState = "installed" | "available" | "manual" | "unsupported";

export interface InstallSnapshot {
  state: InstallState;
  platform: InstallPlatform;
  guide: InstallGuide;
}

/** The non-standard event Chromium fires once a site can be installed. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const OPEN_EVENT = "bonded:install-guide";
let deferred: BeforeInstallPromptEvent | null = null;
let justInstalled = false;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((fn) => fn());
}

// Listening at module load, not in an effect: Chrome can fire before React hydrates.
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    // Keep Chrome's own mini-infobar away; the ask happens where we put it.
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    justInstalled = true;
    deferred = null;
    track(EVENTS.appInstalled);
    notify();
  });
}

export function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

function snapshot(): InstallSnapshot {
  const ua = navigator.userAgent;
  const platform = installPlatformOf(ua, navigator.maxTouchPoints);
  const guide = installGuideOf(ua, platform);
  if (justInstalled || isStandalone()) return { state: "installed", platform, guide };
  if (deferred) return { state: "available", platform, guide };
  if (isInAppBrowserUa(ua) || platform === "other") return { state: "unsupported", platform, guide };
  return { state: "manual", platform, guide };
}

/** null until mounted (the server can't know the device). */
export function useInstallState(): InstallSnapshot | null {
  const [snap, setSnap] = useState<InstallSnapshot | null>(null);
  useEffect(() => {
    const update = () => setSnap(snapshot());
    // A timer, not requestAnimationFrame: rAF waits while the tab is in the background.
    const timer = window.setTimeout(update, 0);
    listeners.add(update);
    return () => {
      window.clearTimeout(timer);
      listeners.delete(update);
    };
  }, []);
  return snap;
}

/** Chrome's own install dialog; "failed" when Chrome refused (a stale event), so callers fall back to the guide. */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "failed"> {
  const event = deferred;
  if (!event) return "failed";
  track(EVENTS.installPromptClicked, { method: "native" });
  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    track(outcome === "accepted" ? EVENTS.installAccepted : EVENTS.installDismissed, { method: "native" });
    if (outcome === "accepted") justInstalled = true;
    return outcome;
  } catch (error) {
    console.error("[install] native prompt failed", error);
    return "failed";
  } finally {
    // The event is single-use; Chrome fires a fresh one if they come back.
    deferred = null;
    notify();
  }
}

export type InstallSource = "button" | "nudge" | "settings";

/** Opens the step-by-step guide (InstallGuide listens), or Chrome's dialog when it's ready. */
export function openInstallGuide(source: InstallSource): void {
  const showGuide = () => {
    track(EVENTS.installPromptShown, { method: "guide", source });
    window.dispatchEvent(new CustomEvent(OPEN_EVENT));
  };
  if (!deferred) return showGuide();
  void promptInstall().then((result) => {
    if (result === "failed") showGuide();
  });
}

/** For InstallGuide: called whenever someone asks for the guide. */
export function onInstallGuideRequest(handler: () => void): () => void {
  window.addEventListener(OPEN_EVENT, handler);
  return () => window.removeEventListener(OPEN_EVENT, handler);
}
