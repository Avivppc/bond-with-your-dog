import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const posthogMock = vi.hoisted(() => ({
  __loaded: true,
  has_opted_in_capturing: vi.fn(() => false),
  has_opted_out_capturing: vi.fn(() => false),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
  clear_opt_in_out_capturing: vi.fn(),
}));

vi.mock("posthog-js", () => ({ default: posthogMock }));

import { syncAnalyticsConsent } from "./analytics-consent";

describe("syncAnalyticsConsent", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
    posthogMock.__loaded = true;
    posthogMock.has_opted_in_capturing.mockReturnValue(false);
    posthogMock.has_opted_out_capturing.mockReturnValue(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test("granting turns cookies on once, without an extra opt-in event", () => {
    syncAnalyticsConsent("granted");

    expect(posthogMock.opt_in_capturing).toHaveBeenCalledWith({ captureEventName: false });
  });

  test("an existing grant is left alone, so page loads don't capture a second pageview", () => {
    posthogMock.has_opted_in_capturing.mockReturnValue(true);

    syncAnalyticsConsent("granted");

    expect(posthogMock.opt_in_capturing).not.toHaveBeenCalled();
  });

  test("denying switches to cookieless counting", () => {
    syncAnalyticsConsent("denied");

    expect(posthogMock.opt_out_capturing).toHaveBeenCalledTimes(1);
  });

  test("an existing denial is left alone", () => {
    posthogMock.has_opted_out_capturing.mockReturnValue(true);

    syncAnalyticsConsent("denied");

    expect(posthogMock.opt_out_capturing).not.toHaveBeenCalled();
  });

  test("an old grant is withdrawn when the choice must be asked again", () => {
    posthogMock.has_opted_in_capturing.mockReturnValue(true);

    syncAnalyticsConsent("undecided");

    expect(posthogMock.clear_opt_in_out_capturing).toHaveBeenCalledTimes(1);
  });

  test("undecided with nothing stored changes nothing", () => {
    syncAnalyticsConsent("undecided");

    expect(posthogMock.clear_opt_in_out_capturing).not.toHaveBeenCalled();
    expect(posthogMock.opt_in_capturing).not.toHaveBeenCalled();
    expect(posthogMock.opt_out_capturing).not.toHaveBeenCalled();
  });

  test("does nothing when PostHog is not loaded", () => {
    posthogMock.__loaded = false;

    syncAnalyticsConsent("granted");

    expect(posthogMock.opt_in_capturing).not.toHaveBeenCalled();
  });
});
