import posthog from "posthog-js";
import { resetAnalytics } from "@/lib/analytics";
import { syncAnalyticsConsent } from "@/lib/analytics-consent";
import { surfaceForPath } from "@/lib/analytics-surface";
import { currentAnalyticsDecision } from "@/lib/consent/policy";

/** Same-origin path rewritten to PostHog in next.config.ts, so ad blockers don't drop events. */
const POSTHOG_PROXY_PATH = "/tails";

const LOGOUT_ACTION = "/auth/logout";

const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (posthogKey) {
  const consent = currentAnalyticsDecision();

  posthog.init(posthogKey, {
    api_host: POSTHOG_PROXY_PATH,
    ui_host: "https://us.posthog.com",
    defaults: "2026-08-30",
    person_profiles: "identified_only",
    // Until a visitor accepts analytics cookies (or if they reject them), PostHog
    // still counts them, but with a server-side hash instead of cookies.
    cookieless_mode: "on_reject",
    opt_out_capturing_by_default: consent !== "granted",
    // Site, app or admin on every event, so funnels, sessions and replays can be split by it.
    before_send: (event) => {
      if (event) event.properties.surface = surfaceForPath(window.location.pathname);
      return event;
    },
  });

  syncAnalyticsConsent(consent);

  // Logout is a plain form POST handled on the server, so the client never
  // sees a sign-out event. Clearing the id here stops the next person on this
  // browser from being merged into the previous member.
  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (form instanceof HTMLFormElement && form.action.endsWith(LOGOUT_ACTION)) {
      resetAnalytics();
    }
  });
} else if (process.env.NODE_ENV === "development") {
  console.warn("[analytics] NEXT_PUBLIC_POSTHOG_KEY is not set, so PostHog is disabled.");
}
