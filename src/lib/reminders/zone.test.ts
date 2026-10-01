import { describe, expect, test } from "vitest";
import { clockTime, localNow, memberZone, relativeDayWord } from "./zone";

const NOW = new Date("2026-10-01T06:00:00Z"); // Thursday

describe("memberZone", () => {
  test("keeps real zones and falls back to UTC otherwise", () => {
    expect(memberZone("Asia/Jerusalem")).toBe("Asia/Jerusalem");
    expect(memberZone(null)).toBe("UTC");
    expect(memberZone("")).toBe("UTC");
    expect(memberZone("Not/AZone")).toBe("UTC");
  });
});

describe("localNow", () => {
  test("gives the member's date and hour", () => {
    expect(localNow(NOW, "Asia/Jerusalem")).toEqual({ zone: "Asia/Jerusalem", date: "2026-10-01", hour: 9 });
    expect(localNow(NOW, "America/Los_Angeles")).toEqual({ zone: "America/Los_Angeles", date: "2026-09-30", hour: 23 });
  });

  test("handles daylight-saving changes (Israel moves its clocks on 2026-10-25)", () => {
    expect(localNow(new Date("2026-10-24T06:00:00Z"), "Asia/Jerusalem").hour).toBe(9);
    expect(localNow(new Date("2026-10-26T06:00:00Z"), "Asia/Jerusalem").hour).toBe(8);
  });
});

describe("relativeDayWord", () => {
  test("names the day in the member's zone", () => {
    expect(relativeDayWord(new Date("2026-10-01T17:00:00Z"), NOW, "Asia/Jerusalem")).toBe("today");
    expect(relativeDayWord(new Date("2026-10-02T17:00:00Z"), NOW, "Asia/Jerusalem")).toBe("tomorrow");
    expect(relativeDayWord(new Date("2026-10-03T17:00:00Z"), NOW, "Asia/Jerusalem")).toBe("on Saturday");
  });

  test("the same instant can be today in one zone and tomorrow in another", () => {
    const session = new Date("2026-10-01T17:00:00Z");
    expect(relativeDayWord(session, NOW, "UTC")).toBe("today");
    expect(relativeDayWord(session, NOW, "America/Los_Angeles")).toBe("tomorrow");
  });
});

test("clockTime shows the local time with the zone's short name", () => {
  expect(clockTime(new Date("2026-10-01T17:00:00Z"), "UTC")).toBe("5:00 PM UTC");
  expect(clockTime(new Date("2026-10-01T17:00:00Z"), "America/New_York")).toBe("1:00 PM EDT");
});
