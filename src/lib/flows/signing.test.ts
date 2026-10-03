import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { readUnsubscribeToken, unsubscribeToken, unsubscribeTokenForEmail, verifyResendWebhook } from "./signing";

const SECRET = `whsec_${Buffer.from("test-secret-key-0123456789").toString("base64")}`;
const NOW = new Date("2026-10-03T12:00:00Z");
const ts = String(NOW.getTime() / 1000);
const body = JSON.stringify({ type: "email.opened", data: { email_id: "abc" } });
const sign = (id: string, t: string, b: string) => createHmac("sha256", Buffer.from(SECRET.slice(6), "base64")).update(`${id}.${t}.${b}`).digest("base64");

describe("verifyResendWebhook", () => {
  it("accepts a correctly signed, fresh event (any of several signatures)", () => {
    const signature = `v1,bogus v1,${sign("msg_1", ts, body)}`;
    expect(verifyResendWebhook(SECRET, { id: "msg_1", timestamp: ts, signature }, body, NOW)).toBe(true);
  });

  it("rejects a tampered body, a wrong secret and stale timestamps", () => {
    const signature = `v1,${sign("msg_1", ts, body)}`;
    expect(verifyResendWebhook(SECRET, { id: "msg_1", timestamp: ts, signature }, `${body} `, NOW)).toBe(false);
    expect(verifyResendWebhook("whsec_b3RoZXI=", { id: "msg_1", timestamp: ts, signature }, body, NOW)).toBe(false);
    const old = String(NOW.getTime() / 1000 - 3600);
    expect(verifyResendWebhook(SECRET, { id: "msg_1", timestamp: old, signature: `v1,${sign("msg_1", old, body)}` }, body, NOW)).toBe(false);
    expect(verifyResendWebhook(SECRET, { id: null, timestamp: ts, signature }, body, NOW)).toBe(false);
  });
});

describe("unsubscribe tokens", () => {
  const user = "0b641034-1111-4222-8333-444455556666";
  it("round-trips a member token and can't be forged for another member", () => {
    const token = unsubscribeToken(user, "s3cret");
    expect(readUnsubscribeToken(token, "s3cret")).toEqual({ userId: user });
    expect(readUnsubscribeToken(token, "other")).toBeNull();
    const other = "11111111-1111-4222-8333-444455556666";
    expect(readUnsubscribeToken(`${other}.${token.split(".")[1]}`, "s3cret")).toBeNull();
    expect(readUnsubscribeToken("not-a-token", "s3cret")).toBeNull();
  });

  it("round-trips an address token for people without an account", () => {
    const token = unsubscribeTokenForEmail("Lead@Test.dev", "s3cret");
    expect(readUnsubscribeToken(token, "s3cret")).toEqual({ email: "lead@test.dev" });
    const forged = `e.${Buffer.from("victim@test.dev").toString("base64url")}.${token.split(".")[2]}`;
    expect(readUnsubscribeToken(forged, "s3cret")).toBeNull();
  });
});
