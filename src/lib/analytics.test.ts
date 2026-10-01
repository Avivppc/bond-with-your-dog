import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const posthogMock = vi.hoisted(() => ({
  __loaded: true,
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  register: vi.fn(),
  setPersonProperties: vi.fn(),
  has_opted_in_capturing: vi.fn(() => true),
  has_opted_out_capturing: vi.fn(() => false),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
  clear_opt_in_out_capturing: vi.fn(),
  get_distinct_id: vi.fn(() => "anon-123"),
}));

vi.mock("posthog-js", () => ({ default: posthogMock }));

const consentMock = vi.hoisted(() => ({ decision: "granted" as "granted" | "denied" | "undecided" }));
vi.mock("./consent/policy", () => ({ currentAnalyticsDecision: () => consentMock.decision }));

import { EVENTS, identifyByEmail, registerMemberContext, resetAnalytics, track } from "./analytics";

describe("analytics", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
    posthogMock.__loaded = true;
    posthogMock.get_distinct_id.mockReturnValue("anon-123");
    posthogMock.has_opted_in_capturing.mockReturnValue(true);
    consentMock.decision = "granted";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  test("captures an event with its properties", () => {
    track(EVENTS.quizStarted, { total_questions: 6 });

    expect(posthogMock.capture).toHaveBeenCalledWith("quiz_started", { total_questions: 6 }, undefined);
  });

  test("sends outbound clicks as a beacon so page unload cannot drop them", () => {
    track(EVENTS.planCtaClicked, { plan: "moves" }, true);

    expect(posthogMock.capture).toHaveBeenCalledWith(
      "plan_cta_clicked",
      { plan: "moves" },
      { transport: "sendBeacon" },
    );
  });

  test("does nothing when PostHog was never initialised (key missing)", () => {
    posthogMock.__loaded = false;

    track(EVENTS.quizStarted);
    identifyByEmail("a@b.com");
    resetAnalytics();

    expect(posthogMock.capture).not.toHaveBeenCalled();
    expect(posthogMock.identify).not.toHaveBeenCalled();
    expect(posthogMock.reset).not.toHaveBeenCalled();
  });

  test("does nothing during server rendering", () => {
    vi.unstubAllGlobals();

    track(EVENTS.quizStarted);

    expect(posthogMock.capture).not.toHaveBeenCalled();
  });

  test("identifies by normalised email so quiz lead and signup become one person", () => {
    identifyByEmail("  Roni@Bonded.Dog ", { name: "Roni" });

    expect(posthogMock.identify).toHaveBeenCalledWith("roni@bonded.dog", {
      email: "roni@bonded.dog",
      name: "Roni",
    });
  });

  test("skips identify when the person is already identified with that email", () => {
    posthogMock.get_distinct_id.mockReturnValue("roni@bonded.dog");

    identifyByEmail("roni@bonded.dog");

    expect(posthogMock.identify).not.toHaveBeenCalled();
  });

  test("skips identify for a blank email", () => {
    identifyByEmail("   ");

    expect(posthogMock.identify).not.toHaveBeenCalled();
  });

  test("every app event carries the active dog, and the person is flagged as staff or member", () => {
    registerMemberContext({ dogId: "dog-1", dogCount: 2, isStaff: true });

    expect(posthogMock.register).toHaveBeenCalledWith({ dog_id: "dog-1", dog_count: 2 });
    expect(posthogMock.setPersonProperties).toHaveBeenCalledWith({ is_staff: true, dog_count: 2 });
  });

  test("a member without a dog yet sends a null dog id", () => {
    registerMemberContext({ dogId: null, dogCount: 0, isStaff: false });

    expect(posthogMock.register).toHaveBeenCalledWith({ dog_id: null, dog_count: 0 });
  });

  test("a visitor who has not accepted cookies is never tied to their email", () => {
    posthogMock.has_opted_in_capturing.mockReturnValue(false);

    identifyByEmail("member@example.com");
    registerMemberContext({ dogId: "dog-1", dogCount: 1, isStaff: false });

    expect(posthogMock.identify).not.toHaveBeenCalled();
    expect(posthogMock.setPersonProperties).not.toHaveBeenCalled();
    expect(posthogMock.register).toHaveBeenCalledWith({ dog_id: "dog-1", dog_count: 1 });
  });

  test("logout forgets the member and re-applies the visitor's cookie choice", () => {
    posthogMock.has_opted_in_capturing.mockReturnValue(false);
    consentMock.decision = "granted";

    resetAnalytics();

    expect(posthogMock.reset).toHaveBeenCalledTimes(1);
    expect(posthogMock.opt_in_capturing).toHaveBeenCalledWith({ captureEventName: false });
  });
});
