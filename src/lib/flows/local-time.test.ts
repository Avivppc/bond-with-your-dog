import { describe, expect, it } from "vitest";
import { describeLocalTime, earliestArrival, nextLocalTime } from "./local-time";

describe("nextLocalTime", () => {
  // Saturday 3 Oct 2026, 12:00 UTC = 15:00 in Jerusalem (UTC+3), 08:00 in New York (UTC-4).
  const NOW = new Date("2026-10-03T12:00:00Z");

  it("finds the next 10:00 in the person's zone", () => {
    expect(nextLocalTime(NOW, "Asia/Jerusalem", 10).toISOString()).toBe("2026-10-04T07:00:00.000Z");
    expect(nextLocalTime(NOW, "America/New_York", 10).toISOString()).toBe("2026-10-03T14:00:00.000Z");
  });

  it("waits for the right weekday", () => {
    // Monday 10:00 in Jerusalem.
    expect(nextLocalTime(NOW, "Asia/Jerusalem", 10, 1).toISOString()).toBe("2026-10-05T07:00:00.000Z");
  });

  it("uses UTC when the zone is unknown", () => {
    expect(nextLocalTime(NOW, null, 18).toISOString()).toBe("2026-10-03T18:00:00.000Z");
  });

  it("never returns the current hour", () => {
    expect(nextLocalTime(new Date("2026-10-03T07:00:00Z"), "Asia/Jerusalem", 10).toISOString()).toBe("2026-10-04T07:00:00.000Z");
  });
});

describe("earliestArrival", () => {
  it("starts a local-time campaign when UTC+14 reaches it", () => {
    expect(earliestArrival("2026-10-05T10:00")?.toISOString()).toBe("2026-10-04T20:00:00.000Z");
  });

  it("refuses anything else", () => {
    expect(earliestArrival("2026-10-05 10:00")).toBeNull();
    expect(earliestArrival("tomorrow")).toBeNull();
  });
});

describe("describeLocalTime", () => {
  it("reads naturally", () => {
    expect(describeLocalTime(9, null)).toBe("09:00 their time");
    expect(describeLocalTime(18, 5)).toBe("Friday 18:00 their time");
  });
});
