import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const posthogMock = vi.hoisted(() => ({
  __loaded: true,
  capture: vi.fn(),
  setPersonProperties: vi.fn(),
}));

vi.mock("posthog-js", () => ({ default: posthogMock }));

import { marketingPersonProps, syncMarketingConsent, type MarketingConsentState } from "./analytics-marketing";

const agreed: MarketingConsentState = {
  optIn: true,
  optInAt: "2026-10-04T10:00:00.000Z",
  source: "signup_form",
  country: "US",
  prechecked: true,
};

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

describe("marketingPersonProps", () => {
  test("describes a yes with where it was given", () => {
    expect(marketingPersonProps(agreed)).toEqual({
      marketing_opt_in: true,
      marketing_opt_in_at: "2026-10-04T10:00:00.000Z",
      marketing_opt_in_source: "signup_form",
      marketing_opt_in_country: "US",
      marketing_opt_in_prechecked: true,
    });
  });

  test("a no carries no proof", () => {
    expect(
      marketingPersonProps({ optIn: false, optInAt: null, source: null, country: null, prechecked: null }),
    ).toEqual({
      marketing_opt_in: false,
      marketing_opt_in_at: null,
      marketing_opt_in_source: null,
      marketing_opt_in_country: null,
      marketing_opt_in_prechecked: null,
    });
  });
});

describe("syncMarketingConsent", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
    posthogMock.__loaded = true;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test("sets the person's properties and records the change when told it is a real change", () => {
    syncMarketingConsent("user-1", agreed, fakeStorage(), true);

    expect(posthogMock.setPersonProperties).toHaveBeenCalledWith(marketingPersonProps(agreed));
    expect(posthogMock.capture).toHaveBeenCalledWith(
      "marketing_consent_changed",
      { granted: true, source: "signup_form", country: "US", prechecked: true },
      undefined,
    );
  });

  test("on a page load it only sets the properties, so a new device doesn't count as a change", () => {
    syncMarketingConsent("user-1", agreed, fakeStorage(), false);

    expect(posthogMock.setPersonProperties).toHaveBeenCalledWith(marketingPersonProps(agreed));
    expect(posthogMock.capture).not.toHaveBeenCalled();
  });

  test("does nothing when this browser already reported the same answer for this member", () => {
    const storage = fakeStorage();
    syncMarketingConsent("user-1", agreed, storage, true);
    vi.clearAllMocks();

    syncMarketingConsent("user-1", agreed, storage, true);

    expect(posthogMock.setPersonProperties).not.toHaveBeenCalled();
    expect(posthogMock.capture).not.toHaveBeenCalled();
  });

  test("reports again when the answer changes or another member signs in", () => {
    const storage = fakeStorage();
    syncMarketingConsent("user-1", agreed, storage, true);
    vi.clearAllMocks();

    syncMarketingConsent("user-1", { ...agreed, optIn: false, optInAt: null, source: null, country: null, prechecked: null }, storage, true);
    expect(posthogMock.capture).toHaveBeenCalledWith("marketing_consent_changed", { granted: false }, undefined);

    vi.clearAllMocks();
    syncMarketingConsent("user-2", agreed, storage, true);
    expect(posthogMock.setPersonProperties).toHaveBeenCalledTimes(1);
  });

  test("still reports when storage is unavailable", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };

    syncMarketingConsent("user-1", agreed, broken, true);

    expect(posthogMock.setPersonProperties).toHaveBeenCalledTimes(1);
  });

  test("does nothing when PostHog was never initialised", () => {
    posthogMock.__loaded = false;

    const storage = fakeStorage();
    syncMarketingConsent("user-1", agreed, storage, true);

    expect(posthogMock.setPersonProperties).not.toHaveBeenCalled();
    expect(posthogMock.capture).not.toHaveBeenCalled();

    // ...and the answer is not remembered as reported, so it is sent once PostHog is available.
    posthogMock.__loaded = true;
    syncMarketingConsent("user-1", agreed, storage, true);
    expect(posthogMock.setPersonProperties).toHaveBeenCalledTimes(1);
  });
});
