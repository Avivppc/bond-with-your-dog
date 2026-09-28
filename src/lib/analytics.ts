import posthog from "posthog-js";
import type { EventName, EventProps } from "./analytics-events";

export * from "./analytics-events";

function isEnabled(): boolean {
  return typeof window !== "undefined" && posthog.__loaded;
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
  if (!isEnabled()) return;
  const id = email.trim().toLowerCase();
  if (!id || posthog.get_distinct_id() === id) return;
  posthog.identify(id, { email: id, ...traits });
}

export function resetAnalytics(): void {
  if (!isEnabled()) return;
  posthog.reset();
}
