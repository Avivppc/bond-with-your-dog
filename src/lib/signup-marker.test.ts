import { describe, expect, test } from "vitest";
import { SIGNUP_COMPLETED_COOKIE, readSignupMarker } from "./signup-marker";

describe("readSignupMarker", () => {
  test("returns the signup method from the one-time cookie", () => {
    expect(readSignupMarker(`theme=dark; ${SIGNUP_COMPLETED_COOKIE}=password; other=1`)).toBe("password");
  });

  test("decodes the value", () => {
    expect(readSignupMarker(`${SIGNUP_COMPLETED_COOKIE}=google%20oauth`)).toBe("google oauth");
  });

  test("is null when the cookie is absent or empty", () => {
    expect(readSignupMarker("theme=dark")).toBeNull();
    expect(readSignupMarker(`${SIGNUP_COMPLETED_COOKIE}=`)).toBeNull();
  });

  test("does not match a cookie whose name merely ends the same way", () => {
    expect(readSignupMarker(`x${SIGNUP_COMPLETED_COOKIE}=password`)).toBeNull();
  });
});
