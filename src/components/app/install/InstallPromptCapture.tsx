"use client";

// Importing the store registers its beforeinstallprompt listener (at module load).
import "./install-store";

/**
 * For member-app pages without the top bar (onboarding): they link the manifest, so Chrome may
 * offer to install there, and the event must be kept for the "Install app" button later.
 */
export function InstallPromptCapture() {
  return null;
}
