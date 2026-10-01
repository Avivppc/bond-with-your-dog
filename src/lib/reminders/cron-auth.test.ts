import { describe, expect, test } from "vitest";
import { isAuthorizedCron } from "./cron-auth";

const SECRET = "a-long-random-cron-secret-123";

describe("isAuthorizedCron", () => {
  test("accepts exactly the bearer secret", () => {
    expect(isAuthorizedCron(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  test("rejects a wrong, missing or differently formatted header", () => {
    expect(isAuthorizedCron(`Bearer ${SECRET}x`, SECRET)).toBe(false);
    expect(isAuthorizedCron(SECRET, SECRET)).toBe(false);
    expect(isAuthorizedCron(`bearer ${SECRET}`, SECRET)).toBe(false);
    expect(isAuthorizedCron(null, SECRET)).toBe(false);
  });

  test("rejects everything when no (or a too-short) secret is configured", () => {
    expect(isAuthorizedCron("Bearer ", undefined)).toBe(false);
    expect(isAuthorizedCron("Bearer undefined", undefined)).toBe(false);
    expect(isAuthorizedCron("Bearer ", "")).toBe(false);
    expect(isAuthorizedCron("Bearer short", "short")).toBe(false);
  });
});
