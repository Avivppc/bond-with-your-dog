import "server-only";
import { createHash } from "node:crypto";
import { after } from "next/server";
import { PostHog } from "posthog-node";
import { analyticsId, type EventName, type EventProps } from "./analytics-events";
import type { Surface } from "./analytics-surface";

export * from "./analytics-events";

const POSTHOG_HOST = "https://us.i.posthog.com";

export interface ServerEvent {
  email: string;
  event: EventName;
  props?: EventProps;
  /** The database row (or order) behind the event. Retries with the same key are counted once. */
  dedupeKey?: string;
  /** When it happened, usually the row's created_at. Needed for dedupe to hold across retries. */
  occurredAt?: Date | string;
  surface?: Surface;
}

let client: PostHog | null | undefined;

function getClient(): PostHog | null {
  if (client === undefined) {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    client = key ? new PostHog(key, { host: POSTHOG_HOST, flushAt: 1, flushInterval: 0 }) : null;
  }
  return client;
}

/**
 * PostHog drops events that share uuid, name, timestamp and distinct_id.
 * Hashing the name with the row key gives every record one stable uuid per event.
 */
function eventUuid(event: EventName, dedupeKey: string): string {
  const hex = createHash("sha256").update(`${event}:${dedupeKey}`).digest("hex");
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** Runs the send after the response is streamed, and keeps analytics failures out of the member's way. */
function sendLater(label: string, send: (posthog: PostHog) => Promise<unknown>): void {
  const posthog = getClient();
  if (!posthog) return;
  after(async () => {
    try {
      await send(posthog);
    } catch (error) {
      console.error(`[analytics] ${label} was not sent`, error instanceof Error ? error.message : error);
    }
  });
}

/**
 * Record a fact from the server: call it only after the database write has
 * succeeded, so ad blockers can't drop it and a failed save never counts.
 */
export function trackServer({ email, event, props = {}, dedupeKey, occurredAt, surface = "app" }: ServerEvent): void {
  const distinctId = analyticsId(email);
  if (!distinctId) return;
  sendLater(event, (posthog) =>
    posthog.captureImmediate({
      distinctId,
      event,
      properties: { ...props, surface, $source: "server" },
      uuid: dedupeKey ? eventUuid(event, dedupeKey) : undefined,
      timestamp: occurredAt ? new Date(occurredAt) : undefined,
      // The request comes from Vercel, so its IP says nothing about the member.
      disableGeoip: true,
    }),
  );
}

/** Set person properties (courses owned, dog count, staff flag) from the server. */
export function identifyServer(email: string, set: EventProps): void {
  const distinctId = analyticsId(email);
  if (!distinctId) return;
  sendLater("identify", (posthog) =>
    posthog.identifyImmediate({ distinctId, properties: { $set: set }, disableGeoip: true }),
  );
}
