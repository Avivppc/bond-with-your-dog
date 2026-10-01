import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  captureImmediate: vi.fn(async (message: { uuid?: string; timestamp?: Date }) => message.uuid),
  identifyImmediate: vi.fn(async (message: unknown) => void message),
  constructed: vi.fn(),
  scheduled: [] as Array<() => Promise<void>>,
  cookies: {} as Record<string, string>,
  headers: {} as Record<string, string>,
  enrollments: [] as Array<{ source: string; expires_at: string | null }>,
  enrollmentsError: null as { message: string } | null,
}));

const ACCEPTED_CONSENT = encodeURIComponent(
  JSON.stringify({ categories: ["necessary", "analytics"], revision: 1, consentId: "c-1" }),
);
const REJECTED_CONSENT = encodeURIComponent(JSON.stringify({ categories: ["necessary"], revision: 1, consentId: "c-1" }));
const OWN_REQUEST = { member: "user-1", ownRequest: true } as const;

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({
  after: (task: () => Promise<void>) => {
    mocks.scheduled.push(task);
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name in mocks.cookies ? { value: mocks.cookies[name] } : undefined),
  }),
  headers: async () => ({ get: (name: string) => mocks.headers[name] ?? null }),
}));
vi.mock("./supabase/admin", () => ({
  createServiceClient: () => ({
    auth: {
      admin: {
        getUserById: async (id: string) => ({
          data: { user: id === "user-1" ? { email: "Member@Example.com" } : null },
          error: null,
        }),
      },
    },
    from: () => ({
      select: () => ({
        eq: async () => ({ data: mocks.enrollments, error: mocks.enrollmentsError }),
      }),
    }),
  }),
}));
vi.mock("posthog-node", () => ({
  PostHog: class {
    constructor(key: string, options: unknown) {
      mocks.constructed(key, options);
    }
    captureImmediate = mocks.captureImmediate;
    identifyImmediate = mocks.identifyImmediate;
  },
}));

async function load() {
  vi.resetModules();
  return import("./analytics-server");
}

async function runScheduled() {
  await Promise.all(mocks.scheduled.splice(0).map((task) => task()));
}

describe("analytics-server", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    mocks.cookies = { bonded_consent: ACCEPTED_CONSENT };
    mocks.headers = {};
    mocks.enrollments = [];
    mocks.enrollmentsError = null;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    vi.restoreAllMocks();
    mocks.scheduled.length = 0;
  });

  test("sends the event after the response, keyed by the lowercased email and tagged as the app", async () => {
    const { trackServer, EVENTS } = await load();

    trackServer({ email: " Member@Example.COM ", event: EVENTS.lessonCompleted, basis: OWN_REQUEST, props: { lesson_position: 3 } });
    expect(mocks.captureImmediate).not.toHaveBeenCalled();
    await runScheduled();

    expect(mocks.captureImmediate).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: "member@example.com",
        event: "lesson_completed",
        properties: expect.objectContaining({ lesson_position: 3, surface: "app", $source: "server" }),
        disableGeoip: true,
      }),
    );
  });

  test("the same record always produces the same event uuid, so a retry is counted once", async () => {
    const { trackServer, EVENTS } = await load();
    const occurredAt = "2026-10-01T10:00:00.000Z";

    trackServer({ email: "a@b.com", event: EVENTS.purchaseCompleted, basis: OWN_REQUEST, dedupeKey: "order-1", occurredAt });
    trackServer({ email: "a@b.com", event: EVENTS.purchaseCompleted, basis: OWN_REQUEST, dedupeKey: "order-1", occurredAt });
    trackServer({ email: "a@b.com", event: EVENTS.purchaseCompleted, basis: OWN_REQUEST, dedupeKey: "order-2", occurredAt });
    await runScheduled();

    const [first, second, third] = mocks.captureImmediate.mock.calls.map(([message]) => message);
    expect(first.uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(second.uuid).toBe(first.uuid);
    expect(third.uuid).not.toBe(first.uuid);
    expect(first.timestamp).toEqual(new Date(occurredAt));
  });

  test("the same record under two event names gets two uuids", async () => {
    const { trackServer, EVENTS } = await load();

    trackServer({ email: "a@b.com", event: EVENTS.videoSubmitted, basis: OWN_REQUEST, dedupeKey: "video-1" });
    trackServer({ email: "a@b.com", event: EVENTS.feedbackSent, basis: OWN_REQUEST, dedupeKey: "video-1" });
    await runScheduled();

    const [submitted, sent] = mocks.captureImmediate.mock.calls.map(([message]) => message);
    expect(submitted.uuid).not.toBe(sent.uuid);
  });

  test("sets person properties with $set", async () => {
    const { identifyServer } = await load();

    identifyServer("A@B.com", { dog_count: 2, is_staff: false }, OWN_REQUEST);
    await runScheduled();

    expect(mocks.identifyImmediate).toHaveBeenCalledWith({
      distinctId: "a@b.com",
      properties: { $set: { dog_count: 2, is_staff: false } },
      disableGeoip: true,
    });
  });

  test("a PostHog failure is logged and never reaches the member", async () => {
    const { trackServer, EVENTS } = await load();
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.captureImmediate.mockRejectedValueOnce(new Error("network down"));

    trackServer({ email: "a@b.com", event: EVENTS.lessonCompleted, basis: OWN_REQUEST });
    await expect(runScheduled()).resolves.toBeUndefined();

    expect(errorLog).toHaveBeenCalledWith("[analytics] lesson_completed was not sent", "network down");
  });

  test("does nothing without a project key", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    const { trackServer, identifyServer, EVENTS } = await load();

    trackServer({ email: "a@b.com", event: EVENTS.lessonCompleted, basis: OWN_REQUEST });
    identifyServer("a@b.com", { dog_count: 1 }, OWN_REQUEST);
    await runScheduled();

    expect(mocks.constructed).not.toHaveBeenCalled();
    expect(mocks.scheduled).toHaveLength(0);
  });

  test("skips events without an email instead of creating an empty person", async () => {
    const { trackServer, EVENTS } = await load();

    trackServer({ email: "  ", event: EVENTS.lessonCompleted, basis: OWN_REQUEST });

    expect(mocks.scheduled).toHaveLength(0);
  });

  describe("consent", () => {
    test("a free member who rejected cookies is not tracked", async () => {
      mocks.cookies = { bonded_consent: REJECTED_CONSENT };
      const { trackServer, EVENTS } = await load();

      trackServer({ email: "a@b.com", event: EVENTS.lessonCompleted, basis: OWN_REQUEST });
      await runScheduled();

      expect(mocks.captureImmediate).not.toHaveBeenCalled();
    });

    test("a paying member who rejected cookies is still tracked", async () => {
      mocks.cookies = { bonded_consent: REJECTED_CONSENT };
      mocks.enrollments = [{ source: "order", expires_at: null }];
      const { trackServer, EVENTS } = await load();

      trackServer({ email: "a@b.com", event: EVENTS.lessonCompleted, basis: OWN_REQUEST });
      await runScheduled();

      expect(mocks.captureImmediate).toHaveBeenCalledTimes(1);
    });

    test("Global Privacy Control without a stored choice counts as a rejection", async () => {
      mocks.cookies = { bonded_consent_region: "opt_out" };
      mocks.headers = { "sec-gpc": "1" };
      const { trackServer, EVENTS } = await load();

      trackServer({ email: "a@b.com", event: EVENTS.lessonCompleted, basis: OWN_REQUEST });
      await runScheduled();

      expect(mocks.captureImmediate).not.toHaveBeenCalled();
    });

    test("in an opt-out region with no choice yet, the member is tracked", async () => {
      mocks.cookies = { bonded_consent_region: "opt_out" };
      const { trackServer, EVENTS } = await load();

      trackServer({ email: "a@b.com", event: EVENTS.lessonCompleted, basis: OWN_REQUEST });
      await runScheduled();

      expect(mocks.captureImmediate).toHaveBeenCalledTimes(1);
    });

    test("staff actions about a member ignore the staff's own cookies and need the member to be paying", async () => {
      const { trackServer, EVENTS } = await load();
      const aboutMember = { member: "user-1", ownRequest: false } as const;

      trackServer({ email: "a@b.com", event: EVENTS.feedbackSent, basis: aboutMember });
      await runScheduled();
      expect(mocks.captureImmediate).not.toHaveBeenCalled();

      mocks.enrollments = [{ source: "subscription", expires_at: null }];
      trackServer({ email: "a@b.com", event: EVENTS.feedbackSent, basis: aboutMember });
      await runScheduled();
      expect(mocks.captureImmediate).toHaveBeenCalledTimes(1);
    });

    test("a purchase is always recorded", async () => {
      mocks.cookies = {};
      const { trackServer, EVENTS } = await load();

      trackServer({ email: "a@b.com", event: EVENTS.purchaseCompleted, basis: { purchase: true } });
      await runScheduled();

      expect(mocks.captureImmediate).toHaveBeenCalledTimes(1);
    });

    test("if the paying check fails, nothing is sent", async () => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      mocks.cookies = { bonded_consent: REJECTED_CONSENT };
      mocks.enrollmentsError = { message: "timeout" };
      const { trackServer, EVENTS } = await load();

      trackServer({ email: "a@b.com", event: EVENTS.lessonCompleted, basis: OWN_REQUEST });
      await runScheduled();

      expect(mocks.captureImmediate).not.toHaveBeenCalled();
    });
  });

  test("trackMember sends the member's own action with their consent as the basis", async () => {
    const { trackMember, EVENTS } = await load();

    trackMember({ id: "user-1", email: "Member@Example.com" }, EVENTS.dogAdded, { dog_count: 2 }, { dedupeKey: "dog-1" });
    await runScheduled();

    expect(mocks.captureImmediate).toHaveBeenCalledWith(
      expect.objectContaining({ distinctId: "member@example.com", event: "dog_added", properties: expect.objectContaining({ dog_count: 2 }) }),
    );
  });

  test("trackMember skips a user without an email", async () => {
    const { trackMember, EVENTS } = await load();

    trackMember({ id: "user-1", email: null }, EVENTS.dogAdded);

    expect(mocks.scheduled).toHaveLength(0);
  });

  test("trackAboutMember files a staff action under the paying member", async () => {
    mocks.enrollments = [{ source: "order", expires_at: null }];
    const { trackAboutMember, EVENTS } = await load();

    trackAboutMember("user-1", EVENTS.feedbackSent, { video_id: "v-1" }, { dedupeKey: "v-1" });
    await runScheduled();

    expect(mocks.captureImmediate).toHaveBeenCalledWith(
      expect.objectContaining({ distinctId: "member@example.com", event: "feedback_sent" }),
    );
  });

  test("trackAboutMember logs and skips a member who can't be found", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.enrollments = [{ source: "order", expires_at: null }];
    const { trackAboutMember, EVENTS } = await load();

    trackAboutMember("missing", EVENTS.feedbackSent);
    await runScheduled();

    expect(mocks.captureImmediate).not.toHaveBeenCalled();
    expect(errorLog).toHaveBeenCalledWith("[analytics] feedback_sent was not sent", "member has no email");
  });

  test("trackPurchase records a payment for the buyer whatever their cookie choice", async () => {
    mocks.cookies = { bonded_consent: REJECTED_CONSENT };
    const { trackPurchase, EVENTS } = await load();

    trackPurchase("user-1", EVENTS.purchaseCompleted, { offer_id: "o-1" }, { dedupeKey: "order-1" });
    await runScheduled();

    expect(mocks.captureImmediate).toHaveBeenCalledWith(
      expect.objectContaining({ distinctId: "member@example.com", event: "purchase_completed" }),
    );
  });
});
