import { describe, expect, test } from "vitest";
import {
  CONSENT_REVISION,
  analyticsDecision,
  parsePolicy,
  policyForCountry,
  readCookie,
  readStoredConsent,
} from "./policy";

function consentCookie(value: object): string {
  return encodeURIComponent(JSON.stringify(value));
}

describe("policyForCountry", () => {
  test("GDPR countries and other opt-in laws get the banner", () => {
    for (const country of ["DE", "FR", "IE", "NO", "IS", "LI", "GB", "CH", "BR"]) {
      expect(policyForCountry(country)).toBe("opt_in");
    }
  });

  test("everywhere else analytics starts on, with a way to turn it off", () => {
    for (const country of ["IL", "US", "AU", "JP"]) {
      expect(policyForCountry(country)).toBe("opt_out");
    }
  });

  test("an unknown country is treated as strict, so a missing header never skips the banner", () => {
    expect(policyForCountry(null)).toBe("opt_in");
    expect(policyForCountry("")).toBe("opt_in");
    expect(policyForCountry("XX")).toBe("opt_out");
  });

  test("country codes are case-insensitive", () => {
    expect(policyForCountry("de")).toBe("opt_in");
  });
});

describe("parsePolicy", () => {
  test("reads the region cookie and falls back to strict", () => {
    expect(parsePolicy("opt_out")).toBe("opt_out");
    expect(parsePolicy("opt_in")).toBe("opt_in");
    expect(parsePolicy(undefined)).toBe("opt_in");
    expect(parsePolicy("anything")).toBe("opt_in");
  });
});

describe("readCookie", () => {
  test("finds one cookie in a document.cookie string", () => {
    expect(readCookie("a=1; bonded_consent_region=opt_out; b=2", "bonded_consent_region")).toBe("opt_out");
    expect(readCookie("a=1", "bonded_consent_region")).toBeUndefined();
    expect(readCookie("", "x")).toBeUndefined();
  });
});

describe("readStoredConsent", () => {
  test("parses the consent library's cookie", () => {
    const raw = consentCookie({ categories: ["necessary", "analytics"], revision: 1, consentId: "abc" });

    expect(readStoredConsent(raw)).toEqual({ categories: ["necessary", "analytics"], revision: 1, consentId: "abc" });
  });

  test("returns null for a missing or broken cookie", () => {
    expect(readStoredConsent(undefined)).toBeNull();
    expect(readStoredConsent("not-json")).toBeNull();
    expect(readStoredConsent(consentCookie({ categories: "analytics" }))).toBeNull();
  });
});

describe("analyticsDecision", () => {
  const accepted = { categories: ["necessary", "analytics"], revision: CONSENT_REVISION, consentId: "a" };
  const rejected = { categories: ["necessary"], revision: CONSENT_REVISION, consentId: "a" };

  test("a choice the visitor made always wins over the region default", () => {
    expect(analyticsDecision("opt_in", accepted)).toBe("granted");
    expect(analyticsDecision("opt_out", rejected)).toBe("denied");
  });

  test("with no choice yet, strict regions wait and the rest start on", () => {
    expect(analyticsDecision("opt_in", null)).toBe("undecided");
    expect(analyticsDecision("opt_out", null)).toBe("granted");
  });

  test("a choice made under an older policy revision is asked again", () => {
    const outdated = { ...accepted, revision: CONSENT_REVISION - 1 };

    expect(analyticsDecision("opt_in", outdated)).toBe("undecided");
  });

  test("Global Privacy Control (California and other US states) turns analytics off by default", () => {
    expect(analyticsDecision("opt_out", null, true)).toBe("denied");
    expect(analyticsDecision("opt_in", null, true)).toBe("denied");
  });

  test("an explicit accept still wins over Global Privacy Control", () => {
    expect(analyticsDecision("opt_out", accepted, true)).toBe("granted");
  });
});
