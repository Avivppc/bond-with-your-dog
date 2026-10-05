"use client";

import { openInstallGuide, useInstallState } from "./install-store";

/**
 * "Install app" in the member top bar (SkiFit's header button). Hidden once installed and on
 * browsers that can neither prompt nor be walked through it. With Chrome's prompt ready the tap
 * installs right away; otherwise it opens the step-by-step guide.
 */
export function InstallAppButton() {
  const install = useInstallState();
  if (!install || install.state === "installed" || install.state === "unsupported") return null;
  return (
    <button type="button" className="install-btn" onClick={() => openInstallGuide("button")}>
      <span className="ms" aria-hidden>
        add
      </span>
      {/* Always a word, never a bare "+": nobody knows what a lone plus does (SkiFit learned this). */}
      Install<span className="install-btn-more"> app</span>
    </button>
  );
}
