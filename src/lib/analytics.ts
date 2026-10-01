import posthog from "posthog-js";
import { analyticsId, type EventName, type EventProps } from "./analytics-events";
import { syncAnalyticsConsent } from "./analytics-consent";
import { currentAnalyticsDecision } from "./consent/policy";

export * from "./analytics-events";

function isEnabled(): boolean {
  return typeof window !== "undefined" && posthog.__loaded;
}

/** Tying events to an email needs the visitor's consent; without it PostHog stays cookieless and anonymous. */
function canIdentify(): boolean {
  return isEnabled() && posthog.has_opted_in_capturing();
}

/**
 * Capture a custom event. `beacon` hands the request to the browser so it
 * survives the page unloading, for clicks that leave the site (Kajabi checkout).
 */
export function track(name: EventName, props: EventProps = {}, beacon = false): void {
  if (!isEnabled()) return;
  posthog.capture(name, props, beacon ? { transport: "sendBeacon" } : undefined);
}

/**
 * Stitch the anonymous visitor to a person. Email is the id so the same
 * person joins up across quiz lead, site signup and a later Kajabi purchase.
 */
export function identifyByEmail(email: string, traits: EventProps = {}): void {
  if (!canIdentify()) return;
  const id = analyticsId(email);
  if (!id || posthog.get_distinct_id() === id) return;
  posthog.identify(id, { email: id, ...traits });
}

export interface MemberContext {
  dogId: string | null;
  dogCount: number;
  isStaff: boolean;
}

/**
 * Attach the active dog to every following event, and flag staff so their
 * own clicks around the app can be filtered out of the dashboards.
 */
export function registerMemberContext({ dogId, dogCount, isStaff }: MemberContext): void {
  if (!isEnabled()) return;
  posthog.register({ dog_id: dogId, dog_count: dogCount });
  if (canIdentify()) posthog.setPersonProperties({ is_staff: isStaff, dog_count: dogCount });
}

/** Forget the signed-in person. reset() also clears PostHog's consent, so the visitor's choice is re-applied. */
export function resetAnalytics(): void {
  if (!isEnabled()) return;
  posthog.reset();
  syncAnalyticsConsent(currentAnalyticsDecision());
}
