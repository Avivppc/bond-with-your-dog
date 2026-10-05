import { describe, expect, it } from "vitest";
import { shouldSendStaffConfirmLink } from "./staff-confirm-policy";

const NOW = new Date("2026-10-03T12:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

describe("shouldSendStaffConfirmLink", () => {
  it("sends the first link, whatever asked for it", () => {
    expect(shouldSendStaffConfirmLink(null, "sign-in", NOW)).toBe(true);
    expect(shouldSendStaffConfirmLink(null, "button", NOW)).toBe(true);
  });

  it("never sends twice within the same second (double-submits, repeated sign-ins)", () => {
    expect(shouldSendStaffConfirmLink(ago(500), "sign-in", NOW)).toBe(false);
    expect(shouldSendStaffConfirmLink(ago(500), "button", NOW)).toBe(false);
  });

  it("sends automatically on sign-in only once, however long ago that was", () => {
    expect(shouldSendStaffConfirmLink(ago(5 * 60 * 1000), "sign-in", NOW)).toBe(false);
    expect(shouldSendStaffConfirmLink(ago(30 * 24 * 60 * 60 * 1000), "sign-in", NOW)).toBe(false);
  });

  it("sends again whenever the member presses the button, after a one-minute cooldown", () => {
    expect(shouldSendStaffConfirmLink(ago(30 * 1000), "button", NOW)).toBe(false);
    expect(shouldSendStaffConfirmLink(ago(61 * 1000), "button", NOW)).toBe(true);
  });
});
