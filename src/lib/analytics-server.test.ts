import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  captureImmediate: vi.fn(async (message: { uuid?: string; timestamp?: Date }) => message.uuid),
  identifyImmediate: vi.fn(async (message: unknown) => void message),
  constructed: vi.fn(),
  scheduled: [] as Array<() => Promise<void>>,
}));

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({
  after: (task: () => Promise<void>) => {
    mocks.scheduled.push(task);
  },
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
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    mocks.scheduled.length = 0;
  });

  test("sends the event after the response, keyed by the lowercased email and tagged as the app", async () => {
    const { trackServer, EVENTS } = await load();

    trackServer({ email: " Member@Example.COM ", event: EVENTS.lessonCompleted, props: { lesson_position: 3 } });
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

    trackServer({ email: "a@b.com", event: EVENTS.purchaseCompleted, dedupeKey: "order-1", occurredAt });
    trackServer({ email: "a@b.com", event: EVENTS.purchaseCompleted, dedupeKey: "order-1", occurredAt });
    trackServer({ email: "a@b.com", event: EVENTS.purchaseCompleted, dedupeKey: "order-2", occurredAt });
    await runScheduled();

    const [first, second, third] = mocks.captureImmediate.mock.calls.map(([message]) => message);
    expect(first.uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    expect(second.uuid).toBe(first.uuid);
    expect(third.uuid).not.toBe(first.uuid);
    expect(first.timestamp).toEqual(new Date(occurredAt));
  });

  test("the same record under two event names gets two uuids", async () => {
    const { trackServer, EVENTS } = await load();

    trackServer({ email: "a@b.com", event: EVENTS.videoSubmitted, dedupeKey: "video-1" });
    trackServer({ email: "a@b.com", event: EVENTS.feedbackSent, dedupeKey: "video-1" });
    await runScheduled();

    const [submitted, sent] = mocks.captureImmediate.mock.calls.map(([message]) => message);
    expect(submitted.uuid).not.toBe(sent.uuid);
  });

  test("sets person properties with $set", async () => {
    const { identifyServer } = await load();

    identifyServer("A@B.com", { dog_count: 2, is_staff: false });
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

    trackServer({ email: "a@b.com", event: EVENTS.lessonCompleted });
    await expect(runScheduled()).resolves.toBeUndefined();

    expect(errorLog).toHaveBeenCalledWith("[analytics] lesson_completed was not sent", "network down");
  });

  test("does nothing without a project key", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    const { trackServer, identifyServer, EVENTS } = await load();

    trackServer({ email: "a@b.com", event: EVENTS.lessonCompleted });
    identifyServer("a@b.com", { dog_count: 1 });
    await runScheduled();

    expect(mocks.constructed).not.toHaveBeenCalled();
    expect(mocks.scheduled).toHaveLength(0);
  });

  test("skips events without an email instead of creating an empty person", async () => {
    const { trackServer, EVENTS } = await load();

    trackServer({ email: "  ", event: EVENTS.lessonCompleted });

    expect(mocks.scheduled).toHaveLength(0);
  });
});
