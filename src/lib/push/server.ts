import "server-only";
import { after } from "next/server";
import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/admin";
import { isGone, pushPayload, readPushConfig, type PushConfig, type PushNotice } from "./payload";

/**
 * Sends in-app notifications to the phones that turned on notifications. Every caller runs it
 * after writing notifications (usually inside after()); claim_push_notifications guarantees each
 * notification goes out at most once (a failed send isn't retried; the bell still has it), and
 * anything older than the window is never pushed late.
 */

const WINDOW_MINUTES = 30;
const CLAIM_LIMIT = 500;
const SEND_BATCH = 20;
/** How long a push service keeps trying a phone that is off. */
const TTL_SECONDS = 12 * 60 * 60;
/** A push service that doesn't answer can't hold up the others (or the daily job). */
const SEND_TIMEOUT_MS = 8000;

type Service = ReturnType<typeof createServiceClient>;

interface Subscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface ClaimedNotice extends PushNotice {
  user_id: string;
}

/** Holds this browser's push address, so signing out can stop the device's notifications. */
export const PUSH_DEVICE_COOKIE = "bonded_push_device";

/** Signing out: this browser stops getting the member's notifications. */
export async function forgetDevice(userId: string | undefined, endpoint: string | undefined): Promise<void> {
  if (!userId || !endpoint) return;
  const { error } = await createServiceClient().from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", userId);
  if (error) console.error("[push] sign-out device delete failed", error.message);
}

export function pushConfig(): PushConfig | null {
  return readPushConfig(process.env);
}

/** Sends one payload to one device; a device that unsubscribed is forgotten. */
async function deliver(sb: Service, config: PushConfig, sub: Subscription, payload: string): Promise<boolean> {
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, {
      TTL: TTL_SECONDS,
      timeout: SEND_TIMEOUT_MS,
      vapidDetails: { subject: config.subject, publicKey: config.publicKey, privateKey: config.privateKey },
    });
    return true;
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode;
    if (isGone(status)) {
      const { error: deleteError } = await sb.from("push_subscriptions").delete().eq("id", sub.id);
      if (deleteError) console.error("[push] stale subscription delete failed", deleteError.message);
    } else {
      console.error("[push] send failed", { status, endpointHost: new URL(sub.endpoint).host });
    }
    return false;
  }
}

async function deliverAll(sb: Service, config: PushConfig, jobs: { sub: Subscription; payload: string }[]): Promise<number> {
  let sent = 0;
  for (let i = 0; i < jobs.length; i += SEND_BATCH) {
    const results = await Promise.all(jobs.slice(i, i + SEND_BATCH).map((j) => deliver(sb, config, j.sub, j.payload)));
    sent += results.filter(Boolean).length;
  }
  return sent;
}

async function subscriptionsOf(sb: Service, userIds: string[]): Promise<Subscription[]> {
  if (userIds.length === 0) return [];
  const { data, error } = await sb.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth").in("user_id", userIds);
  if (error) console.error("[push] subscriptions load failed", error.message);
  return (data ?? []) as Subscription[];
}

/**
 * Pushes the recent notifications not pushed yet: one member's (after an action that notified
 * them) or everyone's (the daily reminders job). Returns how many pushes were delivered.
 */
export async function sendPendingPush(userId: string | null): Promise<number> {
  const config = pushConfig();
  if (!config) return 0;
  const sb = createServiceClient();
  const { data, error } = await sb.rpc("claim_push_notifications", { p_user: userId, p_window_minutes: WINDOW_MINUTES, p_limit: CLAIM_LIMIT });
  if (error) {
    console.error("[push] claim failed", { userId, error: error.message });
    return 0;
  }
  const notices = (data ?? []) as ClaimedNotice[];
  if (notices.length === 0) return 0;

  const subs = await subscriptionsOf(sb, [...new Set(notices.map((n) => n.user_id))]);
  const jobs = notices.flatMap((n) => subs.filter((s) => s.user_id === n.user_id).map((sub) => ({ sub, payload: pushPayload(n) })));
  return deliverAll(sb, config, jobs);
}

/** After the response: push what an action just notified this member about. */
export function pushSoon(userId: string | null | undefined): void {
  if (!userId) return;
  after(async () => {
    try {
      await sendPendingPush(userId);
    } catch (error) {
      console.error("[push] pending push failed", { userId, error: error instanceof Error ? error.message : error });
    }
  });
}

/** "Send a test" in Settings: straight to this member's devices. */
export async function sendTestPush(userId: string): Promise<{ devices: number; sent: number }> {
  const config = pushConfig();
  if (!config) return { devices: 0, sent: 0 };
  const sb = createServiceClient();
  const subs = await subscriptionsOf(sb, [userId]);
  const payload = pushPayload({ id: "test", title: "Notifications are on", body: "This is how Bonded will tell you about Roni's feedback, new lessons and reminders.", href: "/notifications" });
  const sent = await deliverAll(sb, config, subs.map((sub) => ({ sub, payload })));
  return { devices: subs.length, sent };
}
