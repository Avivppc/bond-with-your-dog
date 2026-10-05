import { describe, expect, test } from "vitest";
import { isFirstSignIn } from "./new-user";

describe("isFirstSignIn", () => {
  test("is true when the sign-in happened seconds after the account was created", () => {
    expect(
      isFirstSignIn({ created_at: "2026-09-30T10:00:00Z", last_sign_in_at: "2026-09-30T10:00:02Z" })
    ).toBe(true);
  });

  test("is false for a returning member", () => {
    expect(
      isFirstSignIn({ created_at: "2026-09-01T10:00:00Z", last_sign_in_at: "2026-09-30T10:00:00Z" })
    ).toBe(false);
  });

  test("is true when there is no previous sign-in recorded", () => {
    expect(isFirstSignIn({ created_at: "2026-09-30T10:00:00Z", last_sign_in_at: null })).toBe(true);
  });

  test("is false when timestamps are unreadable", () => {
    expect(isFirstSignIn({ created_at: "nope", last_sign_in_at: "2026-09-30T10:00:00Z" })).toBe(false);
  });
});
