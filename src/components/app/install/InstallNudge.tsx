"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { openInstallGuide, useInstallState } from "./install-store";

const DISMISSED_KEY = "bonded_install_nudge_dismissed";

function dismissedThisVisit(): boolean {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * SkiFit's quiet reminder: a slim bar above the phone tab bar on Home, until the app is installed.
 * ✕ hides it for this visit only (sessionStorage), so it is back next time. It never opens the
 * guide by itself: new members already get the guided tour on their first visit.
 */
export function InstallNudge() {
  const install = useInstallState();
  const pathname = usePathname();
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setHidden(dismissedThisVisit()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const onPhone = install?.platform === "ios" || install?.platform === "android";
  if (hidden || pathname !== "/home" || !install || !onPhone || install.state === "installed" || install.state === "unsupported") return null;

  function dismiss() {
    setHidden(true);
    try {
      sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Private mode: the bar simply comes back on the next page load.
    }
  }

  return (
    <div className="install-nudge">
      <button type="button" className="install-nudge-main" onClick={() => openInstallGuide("nudge")}>
        <span className="install-nudge-icon ms" aria-hidden>
          add
        </span>
        <span className="install-nudge-text">
          Install Bonded <small>Takes a minute. We&apos;ll show you how.</small>
        </span>
        <span className="ms" aria-hidden>
          chevron_right
        </span>
      </button>
      <button type="button" className="install-nudge-close" aria-label="Not now" onClick={dismiss}>
        <span className="ms" aria-hidden>
          close
        </span>
      </button>
    </div>
  );
}
