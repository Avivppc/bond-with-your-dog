"use client";

import { showPreferences } from "vanilla-cookieconsent";

/** Reopens the cookie choice. Required in opt-out regions, offered everywhere. */
export default function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => showPreferences()}>
      Cookie settings
    </button>
  );
}
