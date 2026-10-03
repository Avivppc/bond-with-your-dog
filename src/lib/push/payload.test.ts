import { describe, expect, test } from "vitest";
import { isAllowedPushEndpoint, isGone, pushPayload, pushSubscriptionSchema, readPushConfig } from "./payload";

describe("pushPayload", () => {
  test("carries the title, a short body, where to open and a tag per notification", () => {
    const payload = JSON.parse(pushPayload({ id: "n1", title: "Roni replied", body: "x".repeat(300), href: "/feedback/1" }));
    expect(payload).toMatchObject({ title: "Roni replied", url: "/feedback/1", tag: "n1" });
    expect(payload.body.length).toBeLessThanOrEqual(180);
    expect(payload.body.endsWith("…")).toBe(true);
  });

  test("never sends the member off the site", () => {
    expect(JSON.parse(pushPayload({ id: "n", title: "t", body: "", href: "//evil.example" })).url).toBe("/notifications");
    expect(JSON.parse(pushPayload({ id: "n", title: "t", body: "", href: "https://evil.example" })).url).toBe("/notifications");
  });
});

describe("pushSubscriptionSchema", () => {
  const p256dh = "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM";
  const valid = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh, auth: "tBHItJI5svbpez7KI4CCXg" } };

  test("accepts a browser subscription", () => {
    expect(pushSubscriptionSchema.safeParse(valid).success).toBe(true);
  });

  test("refuses a non-https push address or missing keys", () => {
    expect(pushSubscriptionSchema.safeParse({ ...valid, endpoint: "http://fcm.googleapis.com/x" }).success).toBe(false);
    expect(pushSubscriptionSchema.safeParse({ endpoint: valid.endpoint, keys: { p256dh: "", auth: "a" } }).success).toBe(false);
    expect(pushSubscriptionSchema.safeParse({ endpoint: valid.endpoint, keys: { p256dh: "not base64!".repeat(8), auth: valid.keys.auth } }).success).toBe(false);
  });
});

describe("isAllowedPushEndpoint", () => {
  test("only the browsers' push services", () => {
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/abc")).toBe(true);
    expect(isAllowedPushEndpoint("https://web.push.apple.com/QGx")).toBe(true);
    expect(isAllowedPushEndpoint("https://wns2-db5p.notify.windows.com/w/?token=x")).toBe(true);
  });

  test("never an address a member could point at something else", () => {
    expect(isAllowedPushEndpoint("https://evil.example/push")).toBe(false);
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com.evil.example/x")).toBe(false);
    expect(isAllowedPushEndpoint("https://127.0.0.1/x")).toBe(false);
    expect(isAllowedPushEndpoint("http://fcm.googleapis.com/x")).toBe(false);
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com:8443/x")).toBe(false);
    expect(isAllowedPushEndpoint("https://user:pw@fcm.googleapis.com/x")).toBe(false);
    expect(isAllowedPushEndpoint("not a url")).toBe(false);
  });
});

describe("isGone", () => {
  test("404 and 410 mean the device unsubscribed", () => {
    expect(isGone(410)).toBe(true);
    expect(isGone(404)).toBe(true);
    expect(isGone(500)).toBe(false);
  });
});

describe("readPushConfig", () => {
  test("needs both keys; the contact defaults to the site", () => {
    expect(readPushConfig({ NEXT_PUBLIC_VAPID_PUBLIC_KEY: "pub" })).toBeNull();
    expect(readPushConfig({ NEXT_PUBLIC_VAPID_PUBLIC_KEY: " pub ", VAPID_PRIVATE_KEY: "priv" })).toEqual({ publicKey: "pub", privateKey: "priv", subject: "https://www.bonded.dog" });
    expect(readPushConfig({ NEXT_PUBLIC_VAPID_PUBLIC_KEY: "pub", VAPID_PRIVATE_KEY: "priv", VAPID_SUBJECT: "mailto:team@bonded.dog" })?.subject).toBe("mailto:team@bonded.dog");
  });
});
