import { describe, expect, test } from "vitest";
import { dayKey, daysBetween, groupKeyFor, groupNotifications, notificationIcon, safeNotificationHref } from "./notifications";

const NOW = new Date("2026-10-01T09:30:00Z");

describe("day keys", () => {
  test("uses the viewer's time zone", () => {
    const late = new Date("2026-09-30T23:30:00Z");
    expect(dayKey(late, "UTC")).toBe("2026-09-30");
    expect(dayKey(late, "Asia/Jerusalem")).toBe("2026-10-01");
  });

  test("counts calendar days", () => {
    expect(daysBetween("2026-09-24", "2026-10-01")).toBe(7);
    expect(daysBetween("2026-10-01", "2026-10-01")).toBe(0);
  });
});

describe("groupKeyFor", () => {
  test("today, this week and earlier", () => {
    expect(groupKeyFor("2026-10-01T01:00:00Z", NOW, "UTC")).toBe("today");
    expect(groupKeyFor("2026-09-30T23:00:00Z", NOW, "UTC")).toBe("week");
    expect(groupKeyFor("2026-09-30T23:00:00Z", NOW, "Asia/Jerusalem")).toBe("today");
    expect(groupKeyFor("2026-09-25T10:00:00Z", NOW, "UTC")).toBe("week");
    expect(groupKeyFor("2026-09-24T10:00:00Z", NOW, "UTC")).toBe("earlier");
  });
});

describe("groupNotifications", () => {
  test("keeps order within groups and leaves out empty groups", () => {
    const items = [
      { id: "1", created_at: "2026-10-01T08:00:00Z" },
      { id: "2", created_at: "2026-10-01T07:00:00Z" },
      { id: "3", created_at: "2026-09-10T07:00:00Z" },
    ];
    const groups = groupNotifications(items, NOW, "UTC");
    expect(groups.map((g) => g.label)).toEqual(["Today", "Earlier"]);
    expect(groups[0].items.map((i) => i.id)).toEqual(["1", "2"]);
  });

  test("returns nothing for an empty inbox", () => {
    expect(groupNotifications([], NOW, "UTC")).toEqual([]);
  });
});

test("icons and safe links", () => {
  expect(notificationIcon("achievement")).toBe("workspace_premium");
  expect(notificationIcon("unknown")).toBe("notifications");
  expect(safeNotificationHref("/feedback/1")).toBe("/feedback/1");
  expect(safeNotificationHref("//evil.example")).toBeNull();
  expect(safeNotificationHref("https://evil.example")).toBeNull();
  expect(safeNotificationHref(null)).toBeNull();
});
