import { describe, expect, test } from "vitest";
import { hasPasswordIdentity, hasVerifiedGoogleEmail } from "./google-identity";

const google = (email: string, verified: boolean) => ({
  provider: "google",
  identity_data: { email, email_verified: verified },
});

describe("hasVerifiedGoogleEmail", () => {
  test("is true when Google verified the account's own address", () => {
    expect(hasVerifiedGoogleEmail({ email: "Lili@Gmail.com", identities: [google("lili@gmail.com", true)] })).toBe(true);
  });

  test("is false when Google did not verify the address", () => {
    expect(hasVerifiedGoogleEmail({ email: "lili@gmail.com", identities: [google("lili@gmail.com", false)] })).toBe(false);
  });

  test("is false when the Google address differs from the account email", () => {
    expect(hasVerifiedGoogleEmail({ email: "lili@gmail.com", identities: [google("other@gmail.com", true)] })).toBe(false);
  });

  test("is false for password-only accounts", () => {
    expect(hasVerifiedGoogleEmail({ email: "lili@gmail.com", identities: [{ provider: "email" }] })).toBe(false);
  });
});

describe("hasPasswordIdentity", () => {
  test("spots a password login linked to the account", () => {
    expect(hasPasswordIdentity({ identities: [google("a@b.c", true), { provider: "email" }] })).toBe(true);
    expect(hasPasswordIdentity({ identities: [google("a@b.c", true)] })).toBe(false);
  });
});
