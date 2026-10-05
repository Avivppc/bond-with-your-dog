import { z } from "zod";

/** Phone notifications (Web Push): the pieces both the server and the tests need. Pure. */

export interface PushConfig {
  publicKey: string;
  privateKey: string;
  /** Who the push services can contact about our traffic (a mailto: or https: address). */
  subject: string;
}

const DEFAULT_SUBJECT = "https://www.bonded.dog";

/** The VAPID keys from the environment, or null when phone notifications aren't set up. */
export function readPushConfig(env: Readonly<Record<string, string | undefined>>): PushConfig | null {
  const publicKey = env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject: env.VAPID_SUBJECT?.trim() || DEFAULT_SUBJECT };
}

/** The browsers' push services; the server only ever sends to these (never to an address a member made up). */
const PUSH_HOSTS = new Set(["fcm.googleapis.com", "updates.push.services.mozilla.com", "web.push.apple.com"]);
const PUSH_HOST_SUFFIXES = [".push.services.mozilla.com", ".notify.windows.com", ".push.apple.com"];
export const PUSH_ENDPOINT_MAX = 1000;

export function isAllowedPushEndpoint(raw: string): boolean {
  if (raw.length > PUSH_ENDPOINT_MAX) return false;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return false;
  const host = url.hostname.toLowerCase();
  return PUSH_HOSTS.has(host) || PUSH_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

/** base64url without padding issues: p256dh is a 65-byte key (87 chars), auth 16 bytes (22 chars). */
const BASE64URL = /^[A-Za-z0-9_-]+={0,2}$/;

/** What a browser hands over after subscribing (PushSubscription.toJSON()). */
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().refine(isAllowedPushEndpoint, "Unknown push service."),
  keys: z.object({
    p256dh: z.string().min(86).max(90).regex(BASE64URL),
    auth: z.string().min(21).max(26).regex(BASE64URL),
  }),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;

export interface PushNotice {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
}

const BODY_MAX = 180;
const FALLBACK_URL = "/notifications";

/** Only paths on this site ("/feedback/1"), never "//other.site" or a full URL. */
function sameSitePath(href: string | null): string {
  return href && href.startsWith("/") && !href.startsWith("//") ? href : FALLBACK_URL;
}

/** The JSON the service worker shows; the tag lets a repeat replace rather than stack. */
export function pushPayload(notice: PushNotice): string {
  const body = (notice.body ?? "").trim();
  return JSON.stringify({
    title: notice.title,
    body: body.length > BODY_MAX ? `${body.slice(0, BODY_MAX - 1).trimEnd()}…` : body,
    url: sameSitePath(notice.href),
    tag: notice.id,
  });
}

/** The push service says this device no longer takes notifications. */
export function isGone(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410;
}
