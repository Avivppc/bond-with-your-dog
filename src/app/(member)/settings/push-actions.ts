"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { PUSH_ENDPOINT_MAX, pushSubscriptionSchema, type PushSubscriptionInput } from "@/lib/push/payload";
import { PUSH_DEVICE_COOKIE, pushConfig, sendTestPush } from "@/lib/push/server";

/** Settings → Phone notifications: this device subscribes, unsubscribes, or asks for a test. */
export type PushResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const TRY_AGAIN = "Something went wrong. Please try again.";
const NOT_SET_UP = "Phone notifications aren't available yet.";
const SIGN_IN_AGAIN = "Please sign in again.";
const USER_AGENT_MAX = 300;
/** Older devices beyond this are dropped (a member rarely has more than a phone and a laptop). */
const MAX_DEVICES = 10;
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;
const Endpoint = z.string().min(1).max(PUSH_ENDPOINT_MAX);

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Remembers this browser's device so signing out can stop its notifications. */
async function rememberDevice(endpoint: string | null): Promise<void> {
  const jar = await cookies();
  if (endpoint) jar.set(PUSH_DEVICE_COOKIE, endpoint, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: ONE_YEAR_SECONDS });
  else jar.delete(PUSH_DEVICE_COOKIE);
}

async function dropOldDevices(sb: ReturnType<typeof createServiceClient>, userId: string): Promise<void> {
  const { data, error } = await sb
    .from("push_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .order("last_seen_at", { ascending: false })
    .range(MAX_DEVICES, MAX_DEVICES + 100);
  if (error) return console.error("[push] device count failed", error.message);
  const extra = (data ?? []).map((r) => r.id as string);
  if (extra.length === 0) return;
  const { error: deleteError } = await sb.from("push_subscriptions").delete().in("id", extra);
  if (deleteError) console.error("[push] old devices delete failed", deleteError.message);
}

/** Turns notifications on for this device and the signed-in member (taking it over from another account). */
export async function savePushSubscription(input: PushSubscriptionInput, userAgent: string): Promise<PushResult> {
  if (!pushConfig()) return { ok: false, error: NOT_SET_UP };
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: SIGN_IN_AGAIN };
  const parsed = pushSubscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "This browser's notification service isn't supported." };

  const { endpoint, keys } = parsed.data;
  const sb = createServiceClient();
  const { error } = await sb
    .from("push_subscriptions")
    .upsert(
      { user_id: userId, endpoint, p256dh: keys.p256dh, auth: keys.auth, user_agent: String(userAgent).slice(0, USER_AGENT_MAX), last_seen_at: new Date().toISOString() },
      { onConflict: "endpoint" },
    );
  if (error) {
    console.error("[push] subscription save failed", error.message);
    return { ok: false, error: TRY_AGAIN };
  }
  await dropOldDevices(sb, userId);
  await rememberDevice(endpoint);
  return { ok: true, data: undefined };
}

/**
 * Is this browser's subscription switched on for the signed-in member? A device another account
 * turned on stays off here until this member turns it on themselves.
 */
export async function isDeviceOn(endpoint: string): Promise<PushResult<boolean>> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: SIGN_IN_AGAIN };
  const parsed = Endpoint.safeParse(endpoint);
  if (!parsed.success) return { ok: true, data: false };
  const { data, error } = await createServiceClient()
    .from("push_subscriptions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("endpoint", parsed.data)
    .eq("user_id", userId)
    .select("id");
  if (error) {
    console.error("[push] device check failed", error.message);
    return { ok: false, error: TRY_AGAIN };
  }
  const on = (data ?? []).length > 0;
  if (on) await rememberDevice(parsed.data);
  return { ok: true, data: on };
}

/** Forgets this device (only if it belongs to the signed-in member). */
export async function removePushSubscription(endpoint: string): Promise<PushResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: SIGN_IN_AGAIN };
  const parsed = Endpoint.safeParse(endpoint);
  if (!parsed.success) return { ok: false, error: TRY_AGAIN };
  const { error } = await createServiceClient().from("push_subscriptions").delete().eq("endpoint", parsed.data).eq("user_id", userId);
  if (error) {
    console.error("[push] subscription delete failed", error.message);
    return { ok: false, error: TRY_AGAIN };
  }
  await rememberDevice(null);
  return { ok: true, data: undefined };
}

/** A test to this member's own devices (at most MAX_DEVICES, all on the browsers' push services). */
export async function sendPushTest(): Promise<PushResult<{ sent: number }>> {
  if (!pushConfig()) return { ok: false, error: NOT_SET_UP };
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: SIGN_IN_AGAIN };
  const { devices, sent } = await sendTestPush(userId);
  if (devices === 0) return { ok: false, error: "Turn on notifications on this device first." };
  if (sent === 0) return { ok: false, error: "The test didn't reach your device. Try turning notifications off and on." };
  return { ok: true, data: { sent } };
}
