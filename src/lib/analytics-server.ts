import "server-only";
import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { after } from "next/server";
import { PostHog } from "posthog-node";
import { analyticsId, type EventName, type EventProps } from "./analytics-events";
import type { Surface } from "./analytics-surface";
import {
  CONSENT_COOKIE,
  REGION_COOKIE,
  analyticsDecision,
  parsePolicy,
  readStoredConsent,
  type AnalyticsDecision,
} from "./consent/policy";
import { isPayingMember, serverTrackingAllowed } from "./consent/server-tracking";
import { createServiceClient } from "./supabase/admin";

export * from "./analytics-events";

const POSTHOG_HOST = "https://us.i.posthog.com";

/**
 * Why an event about this person may be sent (see consent/server-tracking.ts):
 * - member: the event is about a member. ownRequest = the member's own browser made the request,
 *   so their cookie choice can be read; otherwise (e.g. Roni sends feedback) only paying counts.
 * - purchase: the event is the payment itself (webhook).
 */
export type TrackingBasis = { member: string; ownRequest: boolean } | { purchase: true };

export interface ServerEvent {
  email: string;
  event: EventName;
  basis: TrackingBasis;
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

/** The member's cookie choice, read from the request they made (cookies and the GPC header). */
async function requestDecision(): Promise<AnalyticsDecision> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  return analyticsDecision(
    parsePolicy(cookieStore.get(REGION_COOKIE)?.value),
    readStoredConsent(cookieStore.get(CONSENT_COOKIE)?.value),
    headerStore.get("sec-gpc") === "1",
  );
}

/** Service role: the member may not be the one making the request. Fails closed. */
async function loadIsPaying(userId: string): Promise<boolean> {
  const { data, error } = await createServiceClient()
    .from("enrollments")
    .select("source, expires_at")
    .eq("user_id", userId);
  if (error) {
    console.error("[analytics] paying check failed", error.message);
    return false;
  }
  return isPayingMember(data ?? [], new Date());
}

async function isAllowed(basis: TrackingBasis): Promise<boolean> {
  if ("purchase" in basis) return true;
  const decision = basis.ownRequest ? await requestDecision() : null;
  if (decision === "granted") return true;
  return serverTrackingAllowed({ requestDecision: decision, isPaying: await loadIsPaying(basis.member) });
}

/**
 * Runs the consent check and the send after the response is streamed, and keeps
 * analytics failures out of the member's way.
 */
function sendLater(label: string, basis: TrackingBasis, send: (posthog: PostHog) => Promise<unknown>): void {
  const posthog = getClient();
  if (!posthog) return;
  after(async () => {
    try {
      if (!(await isAllowed(basis))) return;
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
type CaptureFields = Omit<ServerEvent, "email" | "basis">;

function captureMessage(distinctId: string, { event, props = {}, dedupeKey, occurredAt, surface = "app" }: CaptureFields) {
  return {
    distinctId,
    event,
    // production / preview / development, so test runs can be filtered out like localhost in the browser.
    properties: { ...props, surface, $source: "server", app_env: process.env.VERCEL_ENV ?? "development" },
    uuid: dedupeKey ? eventUuid(event, dedupeKey) : undefined,
    timestamp: occurredAt ? new Date(occurredAt) : undefined,
    // The request comes from Vercel, so its IP says nothing about the member.
    disableGeoip: true,
  };
}

export function trackServer({ email, basis, ...fields }: ServerEvent): void {
  const distinctId = analyticsId(email);
  if (!distinctId) return;
  sendLater(fields.event, basis, (posthog) => posthog.captureImmediate(captureMessage(distinctId, fields)));
}

function sendAboutMember(
  memberId: string,
  basis: TrackingBasis,
  event: EventName,
  props: EventProps,
  options: Pick<ServerEvent, "dedupeKey" | "occurredAt">,
): void {
  sendLater(event, basis, async (posthog) => {
    const { data, error } = await createServiceClient().auth.admin.getUserById(memberId);
    const email = data.user?.email;
    if (error || !email) throw new Error(error?.message ?? "member has no email");
    return posthog.captureImmediate(captureMessage(analyticsId(email), { event, props, ...options }));
  });
}

/**
 * An event about a member caused by someone else, e.g. Roni sending feedback.
 * It is filed under the member (looked up by id), and only for paying members.
 */
export function trackAboutMember(
  memberId: string,
  event: EventName,
  props: EventProps = {},
  options: Pick<ServerEvent, "dedupeKey" | "occurredAt"> = {},
): void {
  sendAboutMember(memberId, { member: memberId, ownRequest: false }, event, props, options);
}

/** A payment or refund from the payment webhook: always recorded, filed under the buyer. */
export function trackPurchase(
  buyerId: string,
  event: EventName,
  props: EventProps = {},
  options: Pick<ServerEvent, "dedupeKey" | "occurredAt"> = {},
): void {
  sendAboutMember(buyerId, { purchase: true }, event, props, options);
}

/** Set person properties (courses owned, dog count, staff flag) from the server. */
export function identifyServer(email: string, set: EventProps, basis: TrackingBasis): void {
  const distinctId = analyticsId(email);
  if (!distinctId) return;
  sendLater("identify", basis, (posthog) =>
    posthog.identifyImmediate({ distinctId, properties: { $set: set }, disableGeoip: true }),
  );
}

export interface SignedInUser {
  id: string;
  email?: string | null;
}

/**
 * The common case: the signed-in member did something in their own request.
 * Their cookie choice (or being a paying member) decides whether it is sent.
 */
export function trackMember(
  user: SignedInUser,
  event: EventName,
  props: EventProps = {},
  options: Pick<ServerEvent, "dedupeKey" | "occurredAt"> = {},
): void {
  if (!user.email) return;
  trackServer({ email: user.email, event, props, basis: { member: user.id, ownRequest: true }, ...options });
}
