import posthog from "posthog-js";
import type { AnalyticsDecision } from "./consent/policy";

/**
 * Bring PostHog in line with the visitor's cookie choice. PostHog runs with
 * cookieless_mode "on_reject", so anyone who has not accepted is still counted,
 * just without cookies or identity.
 *
 * Each branch only acts when PostHog's stored state differs, because
 * opt_in_capturing() also captures a pageview.
 */
export function syncAnalyticsConsent(decision: AnalyticsDecision): void {
  if (typeof window === "undefined" || !posthog.__loaded) return;

  if (decision === "granted") {
    if (!posthog.has_opted_in_capturing()) posthog.opt_in_capturing({ captureEventName: false });
    return;
  }
  if (decision === "denied") {
    if (!posthog.has_opted_out_capturing()) posthog.opt_out_capturing();
    return;
  }
  // Undecided: back to the default (cookieless) if an older grant is still stored.
  if (posthog.has_opted_in_capturing()) posthog.clear_opt_in_out_capturing();
}
