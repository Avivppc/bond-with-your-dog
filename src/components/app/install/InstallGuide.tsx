"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { EVENTS, track } from "@/lib/analytics";
import { chromeCornerForLang, isIosSafariUa, isIpadUa, type InstallGuide as Guide } from "@/lib/install/browser-env";
import { onInstallGuideRequest, promptInstall, useInstallState } from "./install-store";

/**
 * The "Add to Home Screen" walkthrough, ported from SkiFit's InstallSheet: one step per screen, a
 * big instruction, the slice of the demo video showing exactly that action on a loop, one
 * reassuring line, one button. After the last step the sheet steps aside and a "your turn" bar
 * points at the real Share (Safari: bottom centre; Chrome on iPhone and Android: top corner).
 *
 * Unlike SkiFit there is no sign-in hand-over: an iPhone gives a Home Screen app its own storage,
 * so the first launch asks to sign in, and the last step says so (with the member's email).
 * Android installs share Chrome's storage and open signed in.
 */

interface Step {
  title: ReactNode;
  /** null on the last step, which carries the sign-in note instead. */
  reassure: ReactNode | ((corner: "left" | "right") => ReactNode) | null;
  /** [start, end] seconds of the demo video showing this step. */
  slice: [number, number];
}

const LIST_HINT = "Slide the list up a little. It's near the bottom, next to a small ⊞ square.";

const STEPS: Record<Guide, Step[]> = {
  ios: [
    { title: <>Tap the <strong>Share</strong> button</>, reassure: "It's the square with the arrow pointing up, in your browser's bar. You can come back to these instructions any time.", slice: [0, 2.1] },
    { title: <>Choose <strong>Add to Home Screen</strong></>, reassure: LIST_HINT, slice: [2.1, 4.6] },
    { title: <>Tap <strong>Add</strong>. That&apos;s it!</>, reassure: null, slice: [4.6, 9.6] },
  ],
  ios26: [
    { title: <>Tap the <strong>⋯ button</strong></>, reassure: "Three dots in the bar at the bottom, next to the address. On newer Safari the Share button lives behind it.", slice: [0, 1.8] },
    { title: <>Choose <strong>Share</strong></>, reassure: "The square with the arrow pointing up, right there in the menu.", slice: [1.6, 2.9] },
    { title: <>Choose <strong>Add to Home Screen</strong></>, reassure: LIST_HINT, slice: [3.1, 6.4] },
    { title: <>Tap <strong>Add</strong>. That&apos;s it!</>, reassure: null, slice: [6.4, 12] },
  ],
  "ios-chrome": [
    { title: <>Tap the <strong>Share</strong> button</>, reassure: (corner) => `It's at the top ${corner}, next to the address bar: the square with the arrow pointing up.`, slice: [0, 2.4] },
    { title: <>Choose <strong>Add to Home Screen</strong></>, reassure: LIST_HINT, slice: [2.4, 4.8] },
    { title: <>Tap <strong>Add</strong>. That&apos;s it!</>, reassure: null, slice: [4.8, 10] },
  ],
  android: [
    { title: <>Tap the <strong>⋮ menu</strong></>, reassure: "Three little dots in the top corner of your browser. You can come back to these instructions any time.", slice: [0, 2] },
    { title: <>Choose <strong>Add to Home screen</strong></>, reassure: "It's in the list, next to a small ⊞ square.", slice: [2, 4.1] },
    { title: <>Tap <strong>Install</strong>. That&apos;s it!</>, reassure: null, slice: [4.1, 8.9] },
  ],
};

/** timeupdate fires ~4 times a second; rewind a touch early so a loop never shows the next step. */
const SLICE_LOOP_MARGIN_S = 0.08;

export function InstallGuide({ email }: { email: string }) {
  const install = useInstallState();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<"steps" | "go">("steps");
  const [host, setHost] = useState<Element | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<Element | null>(null);
  const goText = useRef<HTMLButtonElement>(null);

  useEffect(
    () =>
      onInstallGuideRequest(() => {
        returnFocus.current = document.activeElement;
        // Every open starts at step 1: a reopened guide is someone who got lost.
        setStep(0);
        setPhase("steps");
        setOpen(true);
        // Inside .member-app (its colours and fonts), not under the top bar's backdrop-filter.
        setHost(document.querySelector(".member-app") ?? document.body);
      }),
    [],
  );

  const guide = install?.guide ?? "ios";
  const steps = STEPS[guide];

  // Loop the current step's slice of the demo video.
  useEffect(() => {
    const el = video.current;
    if (!open || phase !== "steps" || !el) return;
    const [start, end] = steps[step].slice;
    const onTime = () => {
      if (el.currentTime >= end - SLICE_LOOP_MARGIN_S) el.currentTime = start;
    };
    el.currentTime = start;
    void el.play().catch(() => undefined);
    el.addEventListener("timeupdate", onTime);
    return () => el.removeEventListener("timeupdate", onTime);
  }, [open, phase, step, steps]);

  useEffect(() => {
    if (!open) return;
    if (phase === "steps") nextButton.current?.focus();
    else goText.current?.focus();
  }, [open, phase, step]);

  // Escape closes from anywhere, in both phases.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        (returnFocus.current as HTMLElement | null)?.focus?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // While the steps show, the rest of the app can't be tabbed to, clicked or scrolled.
  useEffect(() => {
    if (!open || phase !== "steps" || !host) return;
    const others = Array.from(host.children).filter((el): el is HTMLElement => el instanceof HTMLElement && !el.classList.contains("install-layer") && !el.inert);
    others.forEach((el) => (el.inert = true));
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      others.forEach((el) => (el.inert = false));
      document.documentElement.style.overflow = overflow;
    };
  }, [open, phase, host]);

  if (!open || !host || !install) return null;

  function close() {
    setOpen(false);
    (returnFocus.current as HTMLElement | null)?.focus?.();
  }

  const canPromptNatively = install.state === "available";

  function next() {
    if (step < steps.length - 1) {
      setStep(step + 1);
      track(EVENTS.installWizardStep, { step: step + 2, guide });
      return;
    }
    if (canPromptNatively) {
      void promptInstall();
      close();
      return;
    }
    setPhase("go");
    track(EVENTS.installWizardGo, { guide });
  }

  const corner = chromeCornerForLang(navigator.languages?.[0] ?? navigator.language ?? "");
  const ua = navigator.userAgent;
  // iPad Safari keeps Share at the top; iPhone Safari at the bottom.
  const arrow = guide === "android" || guide === "ios-chrome" || isIpadUa(ua, navigator.maxTouchPoints) ? "top" : isIosSafariUa(ua) ? "bottom" : "none";
  const reassure = steps[step].reassure;
  const ios = guide !== "android";

  const lastStepNote = ios ? (
    <>
      Bonded lands on your Home Screen. Open it from there and, the first time, <strong>sign in as {email}</strong>. Never create a new account.
    </>
  ) : (
    <>
      Bonded lands on your Home Screen and opens <strong>already signed in</strong>, right where you left off.
    </>
  );

  if (phase === "go") {
    return createPortal(
      <div className={`install-layer install-go install-go--${arrow}${corner === "left" ? " install-go--left" : ""}`}>
        <div className="install-go-banner" role="status">
          <button ref={goText} type="button" className="install-go-text" onClick={() => setPhase("steps")}>
            {guide === "android" ? (
              <>
                Open your browser&rsquo;s <strong>⋮ menu</strong> 👆
              </>
            ) : (
              <>
                Open your browser&rsquo;s <strong>Share</strong> menu {arrow === "bottom" ? "👇" : arrow === "top" ? "👆" : ""}
              </>
            )}
            <small>Show me the steps again</small>
          </button>
          <button type="button" className="install-go-close" aria-label="Close" onClick={close}>
            <span className="ms" aria-hidden>
              close
            </span>
          </button>
        </div>
        {arrow !== "none" && (
          <span className="install-go-arrow ms" aria-hidden>
            {arrow === "bottom" ? "south" : "north"}
          </span>
        )}
      </div>,
      host,
    );
  }

  return createPortal(
    <div className="install-layer">
      <div className="install-backdrop" onClick={close} />
      <div className="install-sheet" role="dialog" aria-modal="true" aria-label="Install Bonded">
        <button type="button" className="install-sheet-close" aria-label="Close" onClick={close}>
          <span className="ms" aria-hidden>
            close
          </span>
        </button>
        <div className="install-dots" aria-hidden>
          {steps.map((_, i) => (
            <i key={i} className={i === step ? "on" : undefined} />
          ))}
        </div>
        <p className="install-stepnum">
          Step {step + 1} of {steps.length}
        </p>
        <h2 className="install-title">{steps[step].title}</h2>
        <div className="install-video">
          <video
            ref={video}
            src={`/videos/install-${guide}.mp4`}
            poster={`/videos/install-${guide}-poster.jpg`}
            autoPlay
            muted
            playsInline
            aria-label={`How to install Bonded on ${guide === "android" ? "Android" : "iPhone"}`}
          />
        </div>
        <p className="install-reassure">{reassure === null ? lastStepNote : typeof reassure === "function" ? reassure(corner) : reassure}</p>
        <button ref={nextButton} type="button" className="btn btn-primary install-next" onClick={next}>
          {step < steps.length - 1 ? "Next" : canPromptNatively ? "Install now" : "Add to Home Screen"}
        </button>
        {step > 0 && (
          <button type="button" className="install-back" onClick={() => setStep(step - 1)}>
            ‹ Show me the last step again
          </button>
        )}
      </div>
    </div>,
    host,
  );
}
