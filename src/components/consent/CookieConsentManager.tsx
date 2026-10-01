"use client";

import { useEffect } from "react";
import * as CookieConsent from "vanilla-cookieconsent";
import "vanilla-cookieconsent/dist/cookieconsent.css";
import "./cookie-consent.css";
import { EVENTS, track } from "@/lib/analytics";
import { syncAnalyticsConsent } from "@/lib/analytics-consent";
import {
  ANALYTICS_CATEGORY,
  browserSendsGpc,
  CONSENT_COOKIE,
  CONSENT_REVISION,
  currentPolicy,
  type ConsentPolicy,
} from "@/lib/consent/policy";
import { CONSENT_TEXT } from "./consent-text";

/** How long a choice is kept before we ask again (about six months). */
const CONSENT_DAYS = 182;

/** Proof of consent: stored server-side in consent_records. A failed log never blocks the visitor. */
function logChoice(policy: ConsentPolicy, cookie: CookieConsent.CookieValue): void {
  const { acceptType } = CookieConsent.getUserPreferences();
  fetch("/api/consent", {
    method: "POST",
    keepalive: true,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      consentId: cookie.consentId,
      categories: cookie.categories,
      acceptType,
      policy,
      revision: cookie.revision,
    }),
  }).catch((error: unknown) => {
    console.error("[consent] log failed", error instanceof Error ? error.message : error);
  });
  track(EVENTS.cookieConsentUpdated, { accept_type: acceptType, policy, analytics: cookie.categories.includes(ANALYTICS_CATEGORY) });
}

function applyChoice(cookie: CookieConsent.CookieValue): void {
  syncAnalyticsConsent(cookie.categories.includes(ANALYTICS_CATEGORY) ? "granted" : "denied");
}

/**
 * The cookie banner (strict regions) and the Cookie settings dialog (everywhere).
 * PostHog already started with the right consent in instrumentation-client;
 * this only reacts to what the visitor chooses.
 */
export default function CookieConsentManager() {
  useEffect(() => {
    const policy = currentPolicy();
    // With Global Privacy Control on, analytics starts off everywhere (no banner outside strict regions).
    const startsOff = policy === "opt_in" || browserSendsGpc();
    void CookieConsent.run({
      mode: startsOff ? "opt-in" : "opt-out",
      autoShow: policy === "opt_in",
      revision: CONSENT_REVISION,
      cookie: { name: CONSENT_COOKIE, expiresAfterDays: CONSENT_DAYS },
      guiOptions: {
        consentModal: { layout: "box", position: "bottom left", equalWeightButtons: true },
        preferencesModal: { layout: "box", equalWeightButtons: true },
      },
      categories: {
        necessary: { enabled: true, readOnly: true },
        [ANALYTICS_CATEGORY]: {},
      },
      onConsent: ({ cookie }) => applyChoice(cookie),
      onFirstConsent: ({ cookie }) => logChoice(policy, cookie),
      onChange: ({ cookie }) => {
        applyChoice(cookie);
        logChoice(policy, cookie);
      },
      language: { default: "en", translations: { en: CONSENT_TEXT } },
    });
  }, []);

  return null;
}
