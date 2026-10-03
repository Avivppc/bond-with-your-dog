import { describe, expect, it } from "vitest";
import { checkCode, discountedCents, formatUsd, generateCode, normalizeCode, type CodeRecord } from "./discount";

const NOW = new Date("2026-10-03T12:00:00Z");
const code: CodeRecord = { user_id: "u1", course_id: "bonded-moves", percent: 20, expires_at: "2026-10-10T00:00:00Z", redeemed_at: null };

describe("generateCode", () => {
  it("makes readable BOND-XXXX-XXXX codes without look-alike characters", () => {
    let i = 0;
    const seq = () => (i++ % 10) / 10;
    const c = generateCode(seq);
    expect(c).toMatch(/^BOND-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
  });
});

describe("checkCode", () => {
  it("accepts the owner's valid code for that chapter", () => {
    expect(checkCode(code, "u1", ["bonded-moves"], NOW)).toEqual({ ok: true, percent: 20 });
  });

  it("explains why a code can't be used", () => {
    expect(checkCode(null, "u1", ["bonded-moves"], NOW)).toMatchObject({ ok: false, reason: "That code isn't valid for your account." });
    expect(checkCode(code, "u2", ["bonded-moves"], NOW)).toMatchObject({ reason: "That code isn't valid for your account." });
    expect(checkCode(code, "u1", ["bonded-lets-dance"], NOW)).toMatchObject({ reason: "That code is for a different chapter." });
    expect(checkCode({ ...code, redeemed_at: NOW.toISOString() }, "u1", ["bonded-moves"], NOW)).toMatchObject({ reason: "That code has already been used." });
    expect(checkCode({ ...code, expires_at: "2026-10-01T00:00:00Z" }, "u1", ["bonded-moves"], NOW)).toMatchObject({ reason: "That code has expired." });
  });
});

describe("money helpers", () => {
  it("takes the percentage off and formats dollars", () => {
    expect(discountedCents(12900, 20)).toBe(10320);
    expect(formatUsd(10320)).toBe("$103.20");
    expect(formatUsd(12900)).toBe("$129");
    expect(normalizeCode(" bond-7kq4-m2xd ")).toBe("BOND-7KQ4-M2XD");
  });
});
