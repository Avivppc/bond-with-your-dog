import { describe, expect, test } from "vitest";
import {
  consentEvidence,
  isFreshGoogleSignup,
  marketingPreTickAllowed,
  normalizeCountry,
  requestCountry,
} from "./marketing-consent";

describe("marketingPreTickAllowed", () => {
  test("is on in the United States, where marketing email is opt-out", () => {
    expect(marketingPreTickAllowed("US")).toBe(true);
  });

  test("is off in countries nobody has verified as opt-out", () => {
    for (const country of ["MX", "IN", "AE", "ZA", "SG", "TR", "RU", "CN", "AR", "EG"]) {
      expect(marketingPreTickAllowed(country), country).toBe(false);
    }
  });

  test("is off in every EU and EEA country, the UK and Switzerland", () => {
    const europe = [
      "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT",
      "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO",
      "GB", "CH",
    ];
    for (const country of europe) {
      expect(marketingPreTickAllowed(country), country).toBe(false);
    }
  });

  test("is off in Israel, where the spam law asks for explicit consent beforehand", () => {
    expect(marketingPreTickAllowed("IL")).toBe(false);
  });

  test("is off in the other opt-in countries the business sells to", () => {
    for (const country of ["CA", "AU", "NZ", "BR", "JP", "KR"]) {
      expect(marketingPreTickAllowed(country), country).toBe(false);
    }
  });

  test("is off when the country is unknown, so a missing header never pre-ticks", () => {
    expect(marketingPreTickAllowed(null)).toBe(false);
    expect(marketingPreTickAllowed(undefined)).toBe(false);
    expect(marketingPreTickAllowed("")).toBe(false);
    expect(marketingPreTickAllowed("XX1")).toBe(false);
  });

  test("country codes are case-insensitive", () => {
    expect(marketingPreTickAllowed("us")).toBe(true);
    expect(marketingPreTickAllowed("il")).toBe(false);
  });
});

describe("normalizeCountry", () => {
  test("returns an upper-case ISO code, or null for anything else", () => {
    expect(normalizeCountry("us")).toBe("US");
    expect(normalizeCountry(" IL ")).toBe("IL");
    expect(normalizeCountry("T1")).toBeNull();
    expect(normalizeCountry("USA")).toBeNull();
    expect(normalizeCountry("")).toBeNull();
    expect(normalizeCountry(null)).toBeNull();
  });
});

describe("requestCountry", () => {
  test("reads the country Vercel puts on the request", () => {
    expect(requestCountry(new Headers({ "x-vercel-ip-country": "de" }))).toBe("DE");
  });

  test("is null when the header is missing or not a country (local dev)", () => {
    expect(requestCountry(new Headers())).toBeNull();
    expect(requestCountry(new Headers({ "x-vercel-ip-country": "??" }))).toBeNull();
  });
});

describe("consentEvidence", () => {
  test("records where the choice was made, the country and whether the box came ticked", () => {
    expect(consentEvidence("signup_form", "US")).toEqual({
      marketing_opt_in_source: "signup_form",
      marketing_opt_in_country: "US",
      marketing_opt_in_prechecked: true,
    });
  });

  test("a box that came unticked is recorded as such", () => {
    expect(consentEvidence("signup_form", "IL")).toMatchObject({ marketing_opt_in_prechecked: false });
    expect(consentEvidence("signup_google", null)).toEqual({
      marketing_opt_in_source: "signup_google",
      marketing_opt_in_country: null,
      marketing_opt_in_prechecked: false,
    });
  });

  test("a choice made in settings was never pre-ticked", () => {
    expect(consentEvidence("settings", "US")).toMatchObject({ marketing_opt_in_prechecked: false });
  });
});

describe("isFreshGoogleSignup", () => {
  const created = "2026-10-04T10:00:00.000Z";

  test("a Google account created seconds ago is a sign-up", () => {
    expect(isFreshGoogleSignup({ provider: "google", createdAt: created, lastSignInAt: "2026-10-04T10:00:02.000Z" })).toBe(true);
  });

  test("an existing member signing in again is not, so an old opt-out is never overridden", () => {
    expect(isFreshGoogleSignup({ provider: "google", createdAt: created, lastSignInAt: "2026-11-01T09:00:00.000Z" })).toBe(false);
  });

  test("an email account confirming its link is not a Google sign-up", () => {
    expect(isFreshGoogleSignup({ provider: "email", createdAt: created, lastSignInAt: "2026-10-04T10:00:02.000Z" })).toBe(false);
  });

  test("missing or unreadable dates are never a sign-up", () => {
    expect(isFreshGoogleSignup({ provider: "google", createdAt: undefined, lastSignInAt: created })).toBe(false);
    expect(isFreshGoogleSignup({ provider: "google", createdAt: created, lastSignInAt: "nope" })).toBe(false);
  });
});
